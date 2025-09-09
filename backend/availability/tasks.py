from celery import shared_task
from django.core.cache import cache
from django.utils import timezone
from django.conf import settings
from datetime import datetime, timedelta
from .utils import (
    calculate_available_slots, get_cache_key_for_availability, 
    get_weekly_cache_keys_for_date_range, generate_cache_key_variations,
    get_dirty_organizers, clear_dirty_flags, are_time_intervals_overlapping
)
from apps.users.models import User
from apps.events.models import EventType
import logging

logger = logging.getLogger(__name__)


@shared_task
def process_dirty_cache_flags():
    """
    Process dirty cache flags and perform batch invalidation.
    
    This task runs periodically (every 5 minutes) to process accumulated
    dirty flags and perform efficient cache invalidation using wildcard patterns.
    """
    try:
        dirty_organizer_ids = get_dirty_organizers()
        
        if not dirty_organizer_ids:
            logger.debug("No dirty cache flags to process")
            return "No dirty cache flags to process"
        
        processed_count = 0
        
        for organizer_id in dirty_organizer_ids:
            try:
                # Get dirty data for this organizer
                organizer_dirty_key = f"dirty_cache:{organizer_id}"
                dirty_data = cache.get(organizer_dirty_key)
                
                if not dirty_data:
                    # Dirty flag was cleared by another process
                    clear_dirty_flags(organizer_id)
                    continue
                
                # Determine invalidation strategy based on changes
                requires_full_invalidation = dirty_data.get('requires_full_invalidation', False)
                changes = dirty_data.get('changes', [])
                
                if requires_full_invalidation:
                    # Clear all cache for this organizer using pattern-based invalidation
                    patterns = generate_cache_key_patterns_for_invalidation(organizer_id)
                    total_cleared = 0
                    for pattern in patterns:
                        cleared = _clear_cache_pattern(pattern)
                        total_cleared += cleared
                    logger.info(f"Full cache invalidation for organizer {organizer_id}")
                else:
                    # Selective invalidation based on specific changes using new pattern system
                    total_cleared = 0
                    
                    for change in changes:
                        cache_type = change.get('cache_type')
                        event_type_id = change.get('event_type_id')
                        
                        if cache_type == 'availability_rule_change':
                            # Clear cache for all event types, all future dates
                            patterns = generate_cache_key_patterns_for_invalidation(organizer_id)
                            
                        elif cache_type == 'date_override_change':
                            affected_date = change.get('affected_date')
                            if affected_date:
                                # Clear cache for specific date
                                date_obj = datetime.fromisoformat(affected_date).date()
                                patterns = generate_cache_key_patterns_for_invalidation(
                                    organizer_id, 
                                    date_range=(date_obj, date_obj)
                                )
                            else:
                                patterns = generate_cache_key_patterns_for_invalidation(organizer_id)
                                
                        elif cache_type in ['blocked_time_change', 'recurring_block_change']:
                            # Clear cache for affected date ranges
                            start_date = change.get('start_date')
                            end_date = change.get('end_date')
                            if start_date and end_date:
                                start_date_obj = datetime.fromisoformat(start_date).date()
                                end_date_obj = datetime.fromisoformat(end_date).date()
                                patterns = generate_cache_key_patterns_for_invalidation(
                                    organizer_id,
                                    date_range=(start_date_obj, end_date_obj)
                                )
                            else:
                                patterns = generate_cache_key_patterns_for_invalidation(organizer_id)
                        
                        elif cache_type == 'event_type_change':
                            # Clear cache for specific event type
                            patterns = generate_cache_key_patterns_for_invalidation(
                                organizer_id, 
                                event_type_id=event_type_id
                            )
                        
                        else:
                            # Unknown change type - clear all for safety
                            patterns = generate_cache_key_patterns_for_invalidation(organizer_id)
                    
                        # Clear all patterns for this change
                        for pattern in patterns:
                            cleared = _clear_cache_pattern(pattern)
                            total_cleared += cleared
                    
                    logger.info(f"Selective cache invalidation for organizer {organizer_id}: {total_cleared} keys cleared")
                
                # Trigger precomputation for future availability
                precompute_availability_cache.delay(organizer_id, days_ahead=14)
                
                # Clear dirty flags
                clear_dirty_flags(organizer_id)
                processed_count += 1
                
            except Exception as e:
                logger.error(f"Error processing dirty cache for organizer {organizer_id}: {e}")
                continue
        
        logger.info(f"Processed dirty cache flags for {processed_count} organizers")
        return f"Processed dirty cache flags for {processed_count} organizers"
        
    except Exception as e:
        logger.error(f"Error in process_dirty_cache_flags: {e}")
        return f"Error in process_dirty_cache_flags: {e}"


def _clear_cache_pattern(pattern):
    """
    Clear cache keys matching a pattern.
    
    Args:
        pattern: Redis key pattern (e.g., "availability:organizer_id:*")
    """
    try:
        # Try to use django-redis delete_pattern if available
        if hasattr(cache, 'delete_pattern'):
            try:
                deleted_count = cache.delete_pattern(pattern)
                logger.debug(f"Cleared {deleted_count} cache keys matching pattern: {pattern}")
                return deleted_count
            except Exception as e:
                logger.warning(f"delete_pattern failed for {pattern}: {e}, falling back to manual deletion")
        
        # Fallback: use keys() to find matching keys and delete them
        if hasattr(cache, 'keys'):
            try:
                matching_keys = cache.keys(pattern)
                if matching_keys:
                    # Delete in batches to avoid memory issues with large key sets
                    batch_size = 1000
                    deleted_count = 0
                    for i in range(0, len(matching_keys), batch_size):
                        batch = matching_keys[i:i + batch_size]
                        cache.delete_many(batch)
                        deleted_count += len(batch)
                    logger.debug(f"Cleared {deleted_count} cache keys matching pattern: {pattern}")
                    return deleted_count
                else:
                    logger.debug(f"No cache keys found matching pattern: {pattern}")
                    return 0
            except Exception as e:
                logger.error(f"Error using cache.keys() for pattern {pattern}: {e}")
                return 0
        else:
            logger.warning(f"Cannot clear cache pattern {pattern}: cache backend doesn't support pattern deletion or keys()")
            return 0
                
    except Exception as e:
        logger.error(f"Error clearing cache pattern {pattern}: {e}")
        return 0


@shared_task
def precompute_availability_cache(organizer_id, days_ahead=None):
    """
    Precompute and cache availability for an organizer.
    
    Args:
        organizer_id: UUID of the organizer
        days_ahead: Number of days ahead to precompute (default from settings)
    """
    try:
        organizer = User.objects.get(id=organizer_id, is_organizer=True, is_active=True)
        
        # Get days ahead from settings or use default
        if days_ahead is None:
            days_ahead = getattr(settings, 'AVAILABILITY_CACHE_DAYS_AHEAD', 14)
        
        # Get all active event types for this organizer
        event_types = EventType.objects.filter(organizer=organizer, is_active=True)
        
        start_date = timezone.now().date()
        
        # Process in weekly chunks for better cache granularity
        current_date = start_date
        end_date = start_date + timedelta(days=days_ahead)
        
        total_cached = 0
        
        while current_date <= end_date:
            # Calculate week end (or final end_date if sooner)
            week_end = min(current_date + timedelta(days=6), end_date)
            
            for event_type in event_types:
                try:
                    # Calculate available slots for this week
                    available_slots = calculate_available_slots(
                        organizer=organizer,
                        event_type=event_type,
                        start_date=current_date,
                        end_date=week_end,
                        invitee_timezone='UTC'  # Store in UTC, convert on request
                    )
                    
                    # Create cache key for this week
                    cache_key = get_cache_key_for_availability(
                        organizer.id, event_type.id, current_date, week_end, 'UTC', 1
                    )
                    
                    # Cache for 1 hour
                    cache.set(cache_key, available_slots, timeout=3600)
                    total_cached += 1
                    
                except Exception as e:
                    logger.error(f"Error precomputing availability for {organizer.email}, event type {event_type.name}: {str(e)}")
                    continue
            
            # Move to next week
            current_date = week_end + timedelta(days=1)
        
        logger.info(f"Precomputed availability for {organizer.email} - {len(event_types)} event types, {total_cached} cache entries")
        return f"Precomputed availability for {organizer.email} - {len(event_types)} event types, {total_cached} cache entries"
        
    except User.DoesNotExist:
        logger.error(f"Organizer {organizer_id} not found")
        return f"Organizer {organizer_id} not found"
    except Exception as e:
        logger.error(f"Error precomputing availability: {str(e)}")
        return f"Error precomputing availability: {str(e)}"


@shared_task
def refresh_availability_cache_for_all_organizers():
    """
    Refresh availability cache for all active organizers.
    This task should be run periodically (e.g., every hour).
    """
    active_organizers = User.objects.filter(is_organizer=True, is_active=True)
    
    for organizer in active_organizers:
        precompute_availability_cache.delay(organizer.id)
    
    logger.info(f"Triggered cache refresh for {active_organizers.count()} organizers")
    return f"Triggered cache refresh for {active_organizers.count()} organizers"


@shared_task
def clear_availability_cache(organizer_id, cache_type=None, **kwargs):
    """
    Clear availability cache for a specific organizer with granular control.
    
    Args:
        organizer_id: UUID of the organizer
        cache_type: Type of change that triggered the invalidation
        **kwargs: Additional parameters for specific cache clearing logic
    """
    try:
        organizer = User.objects.get(id=organizer_id)
        event_types = EventType.objects.filter(organizer=organizer, is_active=True)
        
        cache_keys_to_clear = []
        
        if cache_type == 'date_override_change':
            # Clear cache only for the specific date
            affected_date = kwargs.get('affected_date')
            if affected_date:
                affected_date_obj = datetime.fromisoformat(affected_date).date()
                
                for event_type in event_types:
                    # Find all cache keys that might contain this date
                    cache_keys_to_clear.extend(_get_cache_keys_for_date(
                        organizer, event_type, affected_date_obj
                    ))
        
        elif cache_type == 'blocked_time_change':
            # Clear cache for the date range of the blocked time
            start_date = kwargs.get('start_date')
            end_date = kwargs.get('end_date')
            
            if start_date and end_date:
                start_date_obj = datetime.fromisoformat(start_date).date()
                end_date_obj = datetime.fromisoformat(end_date).date()
                
                for event_type in event_types:
                    cache_keys_to_clear.extend(_get_cache_keys_for_date_range(
                        organizer, event_type, start_date_obj, end_date_obj
                    ))
        
        elif cache_type == 'recurring_block_change':
            # Clear cache for all future dates affected by the recurring block
            day_of_week = kwargs.get('day_of_week')
            start_date = kwargs.get('start_date')
            end_date = kwargs.get('end_date')
            
            # Calculate affected dates
            today = timezone.now().date()
            future_limit = today + timedelta(days=90)  # Clear up to 90 days ahead
            
            affected_dates = []
            current_date = today
            
            while current_date <= future_limit:
                if current_date.weekday() == day_of_week:
                    # Check if within the recurring block's date range
                    if start_date:
                        start_date_obj = datetime.fromisoformat(start_date).date()
                        if current_date < start_date_obj:
                            current_date += timedelta(days=1)
                            continue
                    
                    if end_date:
                        end_date_obj = datetime.fromisoformat(end_date).date()
                        if current_date > end_date_obj:
                            break
                    
                    affected_dates.append(current_date)
                
                current_date += timedelta(days=1)
            
            # Clear cache for all affected dates
            for event_type in event_types:
                for affected_date in affected_dates:
                    cache_keys_to_clear.extend(_get_cache_keys_for_date(
                        organizer, event_type, affected_date
                    ))
        
        elif cache_type == 'event_type_change':
            # Clear cache only for the specific event type
            event_type_id = kwargs.get('event_type_id')
            if event_type_id:
                try:
                    event_type = EventType.objects.get(id=event_type_id)
                    cache_keys_to_clear.extend(_get_cache_keys_for_event_type(organizer, event_type))
                except EventType.DoesNotExist:
                    pass
        
        else:
            # Default: clear all cache for this organizer (broad invalidation)
            for event_type in event_types:
                cache_keys_to_clear.extend(_get_cache_keys_for_event_type(organizer, event_type))
        
        # Delete cache keys
        if cache_keys_to_clear:
            cache.delete_many(cache_keys_to_clear)
            logger.info(f"Cleared {len(cache_keys_to_clear)} cache keys for {organizer.email}")
        
        # Trigger fresh precomputation for future availability
        precompute_availability_cache.delay(organizer_id)
        
        return f"Cleared and refreshed cache for {organizer.email}"
        
    except User.DoesNotExist:
        logger.error(f"Organizer {organizer_id} not found")
        return f"Organizer {organizer_id} not found"
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        return f"Error clearing cache: {str(e)}"


def _get_cache_keys_for_date(organizer, event_type, date):
    """Get all cache keys that might contain the specified date."""
    cache_keys = []
    
    # Check weekly chunks that might contain this date
    for days_offset in range(0, 7):
        week_start = date - timedelta(days=days_offset)
        week_end = week_start + timedelta(days=6)
        
        if week_start <= date <= week_end:
            # This weekly chunk contains the affected date
            base_key = f"availability:{organizer.id}:{event_type.id}:{week_start}:{week_end}"
            cache_keys.extend(generate_cache_key_variations(base_key))
    
    return cache_keys


def _get_cache_keys_for_date_range(organizer, event_type, start_date, end_date):
    """Get all cache keys for a date range."""
    cache_keys = []
    current_date = start_date
    
    while current_date <= end_date:
        cache_keys.extend(_get_cache_keys_for_date(organizer, event_type, current_date))
        current_date += timedelta(days=1)
    
    # Remove duplicates
    return list(set(cache_keys))


def _get_cache_keys_for_event_type(organizer, event_type):
    """Get all cache keys for a specific event type (future dates)."""
    cache_keys = []
    
    # Clear cache for the next 90 days
    start_date = timezone.now().date()
    end_date = start_date + timedelta(days=90)
    
    return _get_cache_keys_for_date_range(organizer, event_type, start_date, end_date)


@shared_task
def cleanup_expired_cache_entries():
    """Clean up expired cache entries (Redis handles this automatically, but we can log it)."""
    # This is mainly for monitoring and logging
    # Redis automatically handles TTL expiration
    logger.info("Cache cleanup task executed (Redis handles TTL automatically)")
    return "Cache cleanup completed"


@shared_task
def monitor_cache_performance():
    """Monitor cache performance and log statistics."""
    try:
        # Get Redis info (if using Redis cache)
        from django.core.cache import cache
        
        # This would require Redis-specific commands in production
        # For now, just log that monitoring ran
        logger.info("Cache performance monitoring executed")
        
        return "Cache performance monitoring completed"
        
    except Exception as e:
        logger.error(f"Error monitoring cache performance: {str(e)}")
        return f"Error monitoring cache performance: {str(e)}"


@shared_task
def monitor_cache_performance_detailed():
    """Enhanced cache performance monitoring with detailed metrics."""
    try:
        from django.core.cache import cache
        from django.db import connection
        
        # Get cache statistics
        cache_stats = {
            'timestamp': timezone.now().isoformat(),
            'cache_backend': str(cache.__class__),
        }
        
        # Try to get Redis-specific stats if using Redis
        try:
            if hasattr(cache, '_cache') and hasattr(cache._cache, 'get_client'):
                redis_client = cache._cache.get_client()
                redis_info = redis_client.info()
                cache_stats.update({
                    'redis_memory_used': redis_info.get('used_memory_human'),
                    'redis_keyspace_hits': redis_info.get('keyspace_hits', 0),
                    'redis_keyspace_misses': redis_info.get('keyspace_misses', 0),
                    'redis_connected_clients': redis_info.get('connected_clients', 0),
                })
                
                # Calculate hit rate
                hits = redis_info.get('keyspace_hits', 0)
                misses = redis_info.get('keyspace_misses', 0)
                total = hits + misses
                hit_rate = (hits / total * 100) if total > 0 else 0
                cache_stats['cache_hit_rate'] = round(hit_rate, 2)
        except Exception as e:
            logger.debug(f"Could not get Redis stats: {str(e)}")
        
        # Get database query statistics
        db_stats = {
            'total_queries': len(connection.queries),
        }
        
        # Log comprehensive performance data
        logger.info(f"Cache Performance: {cache_stats}")
        logger.info(f"Database Performance: {db_stats}")
        
        return f"Cache monitoring completed: {cache_stats.get('cache_hit_rate', 'N/A')}% hit rate"
        
    except Exception as e:
        logger.error(f"Error in detailed cache monitoring: {str(e)}")
        return f"Error in detailed cache monitoring: {str(e)}"


@shared_task
def validate_availability_data_integrity():
    """Validate data integrity for availability-related models."""
    from .models import AvailabilityRule, DateOverrideRule, RecurringBlockedTime, BlockedTime
    
    issues_found = []
    
    # Check for overlapping availability rules that might cause confusion
    overlapping_rules = AvailabilityRule.objects.filter(is_active=True).values(
        'organizer', 'day_of_week'
    ).annotate(
        count=models.Count('id')
    ).filter(count__gt=1)
    
    for rule_group in overlapping_rules:
        organizer_id = rule_group['organizer']
        day_of_week = rule_group['day_of_week']
        
        rules = AvailabilityRule.objects.filter(
            organizer_id=organizer_id,
            day_of_week=day_of_week,
            is_active=True
        )
        
        # Check for actual time overlaps
        for i, rule1 in enumerate(rules):
            for rule2 in rules[i+1:]:
                if _rules_overlap(rule1, rule2):
                    issues_found.append(
                        f"Overlapping availability rules for {rule1.organizer.email} on {rule1.get_day_of_week_display()}: "
                        f"{rule1.start_time}-{rule1.end_time} and {rule2.start_time}-{rule2.end_time}"
                    )
    
    # Check for invalid date overrides
    invalid_overrides = DateOverrideRule.objects.filter(
        is_available=True,
        start_time__isnull=True
    )
    
    for override in invalid_overrides:
        issues_found.append(
            f"Invalid date override for {override.organizer.email} on {override.date}: "
            f"is_available=True but no start_time specified"
        )
    
    if issues_found:
        logger.warning(f"Data integrity issues found: {len(issues_found)} issues")
        for issue in issues_found:
            logger.warning(f"  - {issue}")
    else:
        logger.info("No data integrity issues found")
    
    return f"Data integrity check completed. Found {len(issues_found)} issues."


def _rules_overlap(rule1, rule2):
    """
    Check if two availability rules overlap in time.
    
    Args:
        rule1, rule2: AvailabilityRule instances
        
    Returns:
        bool: True if rules overlap in time
    """
    # Handle midnight-spanning rules with more precision
    if rule1.spans_midnight() or rule2.spans_midnight():
        # Split midnight-spanning rules into two intervals and check each
        intervals1 = _get_rule_intervals(rule1)
        intervals2 = _get_rule_intervals(rule2)
        
        # Check if any interval from rule1 overlaps with any interval from rule2
        for start1, end1 in intervals1:
            for start2, end2 in intervals2:
                if are_time_intervals_overlapping(
                    start1.strftime('%H:%M:%S'), 
                    end1.strftime('%H:%M:%S'),
                    start2.strftime('%H:%M:%S'), 
                    end2.strftime('%H:%M:%S'),
                    allow_adjacency=True
                ):
                    return True
        return False
    
    # Normal rules - check for time overlap
    return are_time_intervals_overlapping(
        rule1.start_time.strftime('%H:%M:%S'),
        rule1.end_time.strftime('%H:%M:%S'),
        rule2.start_time.strftime('%H:%M:%S'),
        rule2.end_time.strftime('%H:%M:%S'),
        allow_adjacency=True
def generate_cache_key_patterns_for_invalidation(organizer_id, event_type_id=None, date_range=None):
    """
    Generate cache key patterns for wildcard invalidation.
    
    This replaces the flawed generate_cache_key_variations approach with
    pattern-based invalidation that doesn't rely on hardcoded lists.
    
    Args:
        organizer_id: UUID of the organizer
        event_type_id: UUID of the event type (optional, None for all event types)
        date_range: tuple of (start_date, end_date) (optional, None for all dates)
    
    Returns:
        List of Redis key patterns for deletion
    """
    patterns = []
    
    if event_type_id and date_range:
        # Most specific: organizer + event type + date range
        start_date, end_date = date_range
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.isoformat()
            patterns.append(f"availability:{organizer_id}:{event_type_id}:{date_str}*")
            current_date += timedelta(days=1)
    elif event_type_id:
        # Organizer + specific event type, all dates
        patterns.append(f"availability:{organizer_id}:{event_type_id}:*")
    elif date_range:
        # Organizer + all event types + specific date range
        start_date, end_date = date_range
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.isoformat()
            patterns.append(f"availability:{organizer_id}:*:{date_str}*")
            current_date += timedelta(days=1)
    else:
        # Broadest: all cache for this organizer
        patterns.append(f"availability:{organizer_id}:*")
    
    return patterns
    else:
        return [(rule.start_time, rule.end_time)]