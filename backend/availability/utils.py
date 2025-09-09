import logging
from datetime import datetime, timedelta, time, date
from typing import List, Dict, Any, Optional, Tuple, Union
from zoneinfo import ZoneInfo
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from django.db.models import Q, Count
from apps.users.models import User
import hashlib

logger = logging.getLogger(__name__)


def validate_timezone(tz_string: str) -> bool:
    """
    Validate if a timezone string is valid.
    
    Args:
        tz_string: IANA timezone identifier (e.g., 'America/New_York')
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not tz_string:
        return False
    
    try:
        ZoneInfo(tz_string)
        return True
    except Exception:
        return False


def are_time_intervals_overlapping(
    start1: str, 
    end1: str, 
    start2: str, 
    end2: str, 
    allow_adjacency: bool = False
) -> bool:
    """
    Canonical function for checking if two time intervals overlap.
    
    Args:
        start1, end1: First time interval (HH:MM:SS format)
        start2, end2: Second time interval (HH:MM:SS format)
        allow_adjacency: If True, adjacent intervals are considered overlapping
        
    Returns:
        bool: True if intervals overlap
    """
    if not all([start1, end1, start2, end2]):
        return False
    
    try:
        # Convert time strings to minutes from midnight
        start1_minutes = _time_to_minutes(start1)
        end1_minutes = _time_to_minutes(end1)
        start2_minutes = _time_to_minutes(start2)
        end2_minutes = _time_to_minutes(end2)
        
        # Handle midnight-spanning intervals
        if end1_minutes < start1_minutes:
            end1_minutes += 24 * 60
        if end2_minutes < start2_minutes:
            end2_minutes += 24 * 60
        
        # Check for overlap
        if allow_adjacency:
            return start1_minutes <= end2_minutes and end1_minutes >= start2_minutes
        else:
            return start1_minutes < end2_minutes and end1_minutes > start2_minutes
            
    except Exception as e:
        logger.error(f"Error in time overlap check: {e}")
        return False


def _time_to_minutes(time_str: str) -> int:
    """Convert time string (HH:MM:SS) to minutes from midnight."""
    try:
        parts = time_str.split(':')
        hours = int(parts[0])
        minutes = int(parts[1])
        return hours * 60 + minutes
    except (ValueError, IndexError):
        return 0


def calculate_available_slots(
    organizer: User,
    event_type: 'EventType',
    start_date: date,
    end_date: date,
    invitee_timezone: str = 'UTC',
    attendee_count: int = 1,
    invitee_timezones: Optional[List[str]] = None
) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Calculate available time slots for an organizer within a date range.
    
    Args:
        organizer: User instance (organizer)
        event_type: EventType instance
        start_date: Start date for availability search
        end_date: End date for availability search
        invitee_timezone: IANA timezone string for the invitee
        attendee_count: Number of attendees for group events
        invitee_timezones: List of timezones for multi-invitee scheduling
        
    Returns:
        List of available slots or dict with slots, warnings, and metrics
    """
    import time as time_module
    calculation_start = time_module.time()
    
    warnings = []
    
    # Validate timezone
    if not validate_timezone(invitee_timezone):
        warnings.append(f"Invalid invitee timezone: {invitee_timezone}")
        invitee_timezone = 'UTC'
    
    # Validate multi-invitee timezones
    if invitee_timezones:
        valid_timezones = []
        for tz in invitee_timezones:
            if validate_timezone(tz):
                valid_timezones.append(tz)
            else:
                warnings.append(f"Invalid timezone in list: {tz}")
        invitee_timezones = valid_timezones
    
    try:
        # Get organizer timezone
        organizer_timezone = getattr(organizer.profile, 'timezone_name', 'UTC')
        if not validate_timezone(organizer_timezone):
            organizer_timezone = 'UTC'
            warnings.append(f"Invalid organizer timezone, using UTC")
        
        # Get buffer settings
        from .models import BufferTime
        buffer_settings, _ = BufferTime.objects.get_or_create(organizer=organizer)
        
        # Get effective buffer times (event-specific overrides global defaults)
        buffer_before = getattr(event_type, 'buffer_time_before', None) or buffer_settings.default_buffer_before
        buffer_after = getattr(event_type, 'buffer_time_after', None) or buffer_settings.default_buffer_after
        minimum_gap = buffer_settings.minimum_gap
        slot_interval = getattr(event_type, 'slot_interval_minutes', None) or buffer_settings.slot_interval_minutes
        
        # Calculate available slots for each day
        all_slots = []
        current_date = start_date
        
        while current_date <= end_date:
            daily_slots = _calculate_daily_slots(
                organizer=organizer,
                event_type=event_type,
                target_date=current_date,
                organizer_timezone=organizer_timezone,
                invitee_timezone=invitee_timezone,
                attendee_count=attendee_count,
                buffer_before=buffer_before,
                buffer_after=buffer_after,
                minimum_gap=minimum_gap,
                slot_interval=slot_interval
            )
            all_slots.extend(daily_slots)
            current_date += timedelta(days=1)
        
        # Apply multi-invitee logic if needed
        if invitee_timezones and len(invitee_timezones) > 1:
            all_slots = calculate_multi_invitee_intersection(
                all_slots, invitee_timezones, organizer
            )
        
        # Enhance slots with timezone and DST information
        enhanced_slots = enhance_slots_with_dst_info(all_slots, invitee_timezone)
        
        # Calculate performance metrics
        calculation_time = time_module.time() - calculation_start
        performance_metrics = {
            'duration': calculation_time,
            'total_slots_calculated': len(enhanced_slots),
            'date_range_days': (end_date - start_date).days + 1,
        }
        
        # Return comprehensive result
        return {
            'slots': enhanced_slots,
            'warnings': warnings,
            'performance_metrics': performance_metrics
        }
        
    except Exception as e:
        logger.error(f"Error calculating availability for {organizer.email}: {e}")
        return {
            'slots': [],
            'warnings': warnings + [f"Calculation error: {str(e)}"],
            'performance_metrics': {'duration': time_module.time() - calculation_start}
        }


def _calculate_daily_slots(
    organizer: User,
    event_type: 'EventType',
    target_date: date,
    organizer_timezone: str,
    invitee_timezone: str,
    attendee_count: int,
    buffer_before: int,
    buffer_after: int,
    minimum_gap: int,
    slot_interval: int
) -> List[Dict[str, Any]]:
    """Calculate available slots for a specific day."""
    
    # Get daily available intervals from rules and overrides
    available_intervals = _get_daily_available_intervals(
        organizer, event_type, target_date, organizer_timezone
    )
    
    if not available_intervals:
        return []
    
    # Generate potential slots from intervals
    potential_slots = []
    for interval_start, interval_end in available_intervals:
        interval_slots = _generate_slots_from_interval(
            interval_start, interval_end, event_type.duration, slot_interval
        )
        potential_slots.extend(interval_slots)
    
    # Filter out blocked and conflicting slots
    available_slots = []
    for slot in potential_slots:
        if not is_slot_blocked(organizer, slot, target_date):
            if not is_slot_conflicting_with_bookings(
                organizer, event_type, slot, attendee_count, buffer_before, buffer_after, minimum_gap
            ):
                available_slots.append(slot)
    
    return available_slots


def _get_daily_available_intervals(
    organizer: User,
    event_type: 'EventType',
    target_date: date,
    organizer_timezone: str
) -> List[Tuple[datetime, datetime]]:
    """Get available time intervals for a specific day."""
    from .models import AvailabilityRule, DateOverrideRule
    
    # Check for date overrides first (they take precedence)
    date_overrides = DateOverrideRule.objects.filter(
        organizer=organizer,
        date=target_date,
        is_active=True
    )
    
    # Filter overrides that apply to this event type
    applicable_overrides = [
        override for override in date_overrides
        if override.applies_to_event_type(event_type)
    ]
    
    if applicable_overrides:
        intervals = []
        for override in applicable_overrides:
            if override.is_available and override.start_time and override.end_time:
                # Convert to datetime in organizer timezone
                start_dt = datetime.combine(target_date, override.start_time)
                end_dt = datetime.combine(target_date, override.end_time)
                
                # Handle midnight spanning
                if override.spans_midnight():
                    end_dt += timedelta(days=1)
                
                # Convert to timezone-aware datetimes
                tz = ZoneInfo(organizer_timezone)
                start_dt = start_dt.replace(tzinfo=tz)
                end_dt = end_dt.replace(tzinfo=tz)
                
                intervals.append((start_dt, end_dt))
        return intervals
    
    # No overrides, use regular availability rules
    day_of_week = target_date.weekday()
    availability_rules = AvailabilityRule.objects.filter(
        organizer=organizer,
        day_of_week=day_of_week,
        is_active=True
    )
    
    # Filter rules that apply to this event type
    applicable_rules = [
        rule for rule in availability_rules
        if rule.applies_to_event_type(event_type)
    ]
    
    intervals = []
    for rule in applicable_rules:
        # Convert to datetime in organizer timezone
        start_dt = datetime.combine(target_date, rule.start_time)
        end_dt = datetime.combine(target_date, rule.end_time)
        
        # Handle midnight spanning
        if rule.spans_midnight():
            end_dt += timedelta(days=1)
        
        # Convert to timezone-aware datetimes
        tz = ZoneInfo(organizer_timezone)
        start_dt = start_dt.replace(tzinfo=tz)
        end_dt = end_dt.replace(tzinfo=tz)
        
        intervals.append((start_dt, end_dt))
    
    # Merge overlapping intervals
    return merge_overlapping_intervals(intervals)


def _generate_slots_from_interval(
    interval_start: datetime,
    interval_end: datetime,
    duration_minutes: int,
    slot_interval_minutes: int
) -> List[Dict[str, Any]]:
    """Generate time slots within an available interval."""
    slots = []
    current_time = interval_start
    
    while current_time + timedelta(minutes=duration_minutes) <= interval_end:
        slot_end = current_time + timedelta(minutes=duration_minutes)
        
        slots.append({
            'start_time': current_time,
            'end_time': slot_end,
            'duration_minutes': duration_minutes
        })
        
        current_time += timedelta(minutes=slot_interval_minutes)
    
    return slots


def is_slot_blocked(organizer: User, slot: Dict[str, Any], target_date: date) -> bool:
    """Check if a slot is blocked by one-time or recurring blocks."""
    return (
        is_slot_blocked_by_one_time(organizer, slot) or
        is_slot_blocked_by_recurring(organizer, slot, target_date)
    )


def is_slot_blocked_by_one_time(organizer: User, slot: Dict[str, Any]) -> bool:
    """Check if a slot is blocked by one-time blocked times."""
    from .models import BlockedTime
    
    slot_start = slot['start_time']
    slot_end = slot['end_time']
    
    blocked_times = BlockedTime.objects.filter(
        organizer=organizer,
        is_active=True,
        start_datetime__lt=slot_end,
        end_datetime__gt=slot_start
    )
    
    return blocked_times.exists()


def is_slot_blocked_by_recurring(organizer: User, slot: Dict[str, Any], target_date: date) -> bool:
    """Check if a slot is blocked by recurring blocked times."""
    from .models import RecurringBlockedTime
    
    slot_start = slot['start_time']
    slot_end = slot['end_time']
    
    # Get recurring blocks for the day of week
    day_of_week = target_date.weekday()
    recurring_blocks = RecurringBlockedTime.objects.filter(
        organizer=organizer,
        day_of_week=day_of_week,
        is_active=True
    )
    
    for block in recurring_blocks:
        # Check if block applies to this date
        if not block.applies_to_date(target_date):
            continue
        
        # Convert block times to datetime for comparison
        block_start = datetime.combine(target_date, block.start_time)
        block_end = datetime.combine(target_date, block.end_time)
        
        # Handle midnight spanning
        if block.spans_midnight():
            block_end += timedelta(days=1)
        
        # Add timezone info to match slot times
        if slot_start.tzinfo:
            block_start = block_start.replace(tzinfo=slot_start.tzinfo)
            block_end = block_end.replace(tzinfo=slot_start.tzinfo)
        
        # Check for overlap
        if block_start < slot_end and block_end > slot_start:
            return True
    
    return False


def is_slot_conflicting_with_bookings(
    organizer: User,
    event_type: 'EventType',
    slot: Dict[str, Any],
    attendee_count: int,
    buffer_before: int,
    buffer_after: int,
    minimum_gap: int
) -> bool:
    """Check if a slot conflicts with existing bookings."""
    from apps.events.models import Booking
    
    slot_start = slot['start_time']
    slot_end = slot['end_time']
    
    # Calculate protected zone around the proposed slot
    protected_start = slot_start - timedelta(minutes=buffer_before)
    protected_end = slot_end + timedelta(minutes=buffer_after)
    
    # Get existing bookings that might conflict
    existing_bookings = Booking.objects.filter(
        organizer=organizer,
        status='confirmed',
        start_time__lt=protected_end,
        end_time__gt=protected_start
    )
    
    for booking in existing_bookings:
        # Calculate protected zone around existing booking
        booking_protected_start = booking.start_time - timedelta(minutes=minimum_gap)
        booking_protected_end = booking.end_time + timedelta(minutes=minimum_gap)
        
        # Check for overlap with protected zones
        if (booking_protected_start < protected_end and 
            booking_protected_end > protected_start):
            
            # For group events, check capacity
            if getattr(event_type, 'is_group_event', False) and booking.event_type_id == event_type.id:
                # Sum attendees from all overlapping bookings of the same event type
                overlapping_bookings = Booking.objects.filter(
                    organizer=organizer,
                    event_type=event_type,
                    status='confirmed',
                    start_time__lt=slot_end,
                    end_time__gt=slot_start
                )
                
                total_confirmed_attendees = sum(
                    booking.attendee_count for booking in overlapping_bookings
                )
                
                if total_confirmed_attendees + attendee_count > event_type.max_attendees:
                    return True
            else:
                # Individual event - any overlap is a conflict
                return True
    
    return False


def calculate_multi_invitee_intersection(
    slots: List[Dict[str, Any]],
    invitee_timezones: List[str],
    organizer: User
) -> List[Dict[str, Any]]:
    """Calculate timezone intersection and fairness scores for multi-invitee scheduling."""
    
    # Get reasonable hours from organizer profile
    reasonable_start = getattr(organizer.profile, 'reasonable_hours_start', 9)
    reasonable_end = getattr(organizer.profile, 'reasonable_hours_end', 18)
    
    enhanced_slots = []
    
    for slot in slots:
        slot_start_utc = slot['start_time']
        slot_end_utc = slot['end_time']
        
        invitee_times = {}
        reasonable_count = 0
        
        for tz in invitee_timezones:
            try:
                # Convert to invitee timezone
                local_start = slot_start_utc.astimezone(ZoneInfo(tz))
                local_end = slot_end_utc.astimezone(ZoneInfo(tz))
                
                invitee_times[tz] = {
                    'start_time': local_start.isoformat(),
                    'end_time': local_end.isoformat(),
                    'start_hour': local_start.hour,
                    'end_hour': local_end.hour,
                    'is_reasonable': reasonable_start <= local_start.hour <= reasonable_end
                }
                
                # Count reasonable slots
                if invitee_times[tz]['is_reasonable']:
                    reasonable_count += 1
                    
            except Exception as e:
                logger.warning(f"Error processing timezone {tz}: {e}")
                continue
        
        # Calculate fairness score
        fairness_score = reasonable_count / len(invitee_timezones) if invitee_timezones else 1.0
        
        # Add enhanced information to slot
        enhanced_slot = {
            **slot,
            'invitee_times': invitee_times,
            'fairness_score': fairness_score
        }
        
        enhanced_slots.append(enhanced_slot)
    
    # Sort by fairness score (highest first)
    enhanced_slots.sort(key=lambda x: x.get('fairness_score', 0), reverse=True)
    
    return enhanced_slots


def enhance_slots_with_dst_info(
    slots: List[Dict[str, Any]], 
    invitee_timezone: str
) -> List[Dict[str, Any]]:
    """Add timezone and DST information to slots."""
    
    enhanced_slots = []
    
    for slot in slots:
        try:
            # Convert to invitee timezone
            local_start = slot['start_time'].astimezone(ZoneInfo(invitee_timezone))
            local_end = slot['end_time'].astimezone(ZoneInfo(invitee_timezone))
            
            enhanced_slot = {
                **slot,
                'local_start_time': local_start,
                'local_end_time': local_end,
                'is_dst': bool(local_start.dst()) if local_start.dst() is not None else False
            }
            
            enhanced_slots.append(enhanced_slot)
            
        except Exception as e:
            logger.warning(f"Error enhancing slot with DST info: {e}")
            enhanced_slots.append(slot)  # Keep original slot
    
    return enhanced_slots


def merge_overlapping_intervals(intervals: List[Tuple[datetime, datetime]]) -> List[Tuple[datetime, datetime]]:
    """Merge overlapping or adjacent time intervals."""
    if not intervals:
        return []
    
    # Sort intervals by start time
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_intervals[0]]
    
    for current_start, current_end in sorted_intervals[1:]:
        last_start, last_end = merged[-1]
        
        # Check if current interval overlaps or is adjacent to the last one
        if current_start <= last_end:
            # Merge intervals
            merged[-1] = (last_start, max(last_end, current_end))
        else:
            # No overlap, add as separate interval
            merged.append((current_start, current_end))
    
    return merged


def merge_overlapping_slots(slots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Merge overlapping or adjacent slots."""
    if not slots:
        return []
    
    # Sort slots by start time
    sorted_slots = sorted(slots, key=lambda x: x['start_time'])
    merged = [sorted_slots[0]]
    
    for current_slot in sorted_slots[1:]:
        last_slot = merged[-1]
        
        # Check if current slot is adjacent to the last one
        if current_slot['start_time'] <= last_slot['end_time']:
            # Merge slots
            merged[-1] = {
                'start_time': last_slot['start_time'],
                'end_time': max(last_slot['end_time'], current_slot['end_time']),
                'duration_minutes': int((max(last_slot['end_time'], current_slot['end_time']) - last_slot['start_time']).total_seconds() / 60)
            }
        else:
            # No overlap, add as separate slot
            merged.append(current_slot)
    
    return merged


def calculate_timezone_offset_hours(
    from_timezone: str, 
    to_timezone: str, 
    reference_date: Optional[date] = None
) -> float:
    """Calculate timezone offset in hours."""
    if reference_date is None:
        reference_date = timezone.now().date()
    
    try:
        # Create a reference datetime
        ref_datetime = datetime.combine(reference_date, time(12, 0))
        
        # Convert to both timezones
        from_tz = ZoneInfo(from_timezone)
        to_tz = ZoneInfo(to_timezone)
        
        from_dt = ref_datetime.replace(tzinfo=from_tz)
        to_dt = from_dt.astimezone(to_tz)
        
        # Calculate offset
        offset_seconds = (to_dt.utcoffset() - from_dt.utcoffset()).total_seconds()
        return offset_seconds / 3600
        
    except Exception as e:
        logger.error(f"Error calculating timezone offset: {e}")
        return 0.0


# Cache Management Functions

def get_cache_key_for_availability(
    organizer_id: str,
    event_type_id: str,
    start_date: date,
    end_date: date,
    invitee_timezone: str,
    attendee_count: int
) -> str:
    """Generate cache key for availability calculation."""
    key_parts = [
        'availability',
        str(organizer_id),
        str(event_type_id),
        start_date.isoformat(),
        end_date.isoformat(),
        invitee_timezone,
        str(attendee_count)
    ]
    return ':'.join(key_parts)


def mark_cache_dirty(
    organizer_id: str,
    cache_type: str,
    requires_full_invalidation: bool = False,
    **kwargs
) -> None:
    """Mark an organizer's cache as dirty for later processing."""
    
    dirty_key = f"dirty_cache:{organizer_id}"
    
    # Get existing dirty data or create new
    dirty_data = cache.get(dirty_key, {
        'organizer_id': organizer_id,
        'requires_full_invalidation': False,
        'changes': []
    })
    
    # Update dirty data
    if requires_full_invalidation:
        dirty_data['requires_full_invalidation'] = True
    
    # Add change details
    change_data = {
        'cache_type': cache_type,
        'timestamp': timezone.now().isoformat(),
        **kwargs
    }
    dirty_data['changes'].append(change_data)
    
    # Store dirty data
    cache.set(dirty_key, dirty_data, timeout=3600)  # 1 hour timeout
    
    # Add to dirty organizers list
    dirty_list_key = "dirty_cache_list"
    dirty_organizers = cache.get(dirty_list_key, set())
    dirty_organizers.add(organizer_id)
    cache.set(dirty_list_key, dirty_organizers, timeout=3600)


def get_dirty_organizers() -> List[str]:
    """Get list of organizers with dirty cache flags."""
    dirty_list_key = "dirty_cache_list"
    dirty_organizers = cache.get(dirty_list_key, set())
    return list(dirty_organizers)


def clear_dirty_flags(organizer_id: str) -> None:
    """Clear dirty cache flags for an organizer."""
    # Remove detailed dirty data
    dirty_key = f"dirty_cache:{organizer_id}"
    cache.delete(dirty_key)
    
    # Remove from dirty list
    dirty_list_key = "dirty_cache_list"
    dirty_organizers = cache.get(dirty_list_key, set())
    dirty_organizers.discard(organizer_id)
    cache.set(dirty_list_key, dirty_organizers, timeout=3600)


def generate_cache_key_patterns_for_invalidation(
    organizer_id: str,
    event_type_id: Optional[str] = None,
    date_range: Optional[Tuple[date, date]] = None
) -> List[str]:
    """Generate cache key patterns for wildcard invalidation."""
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


def get_weekly_cache_keys_for_date_range(
    organizer_id: str,
    start_date: date,
    end_date: date
) -> List[str]:
    """Get cache keys for weekly chunks within a date range."""
    cache_keys = []
    current_date = start_date
    
    while current_date <= end_date:
        # Find start of week (Monday)
        week_start = current_date - timedelta(days=current_date.weekday())
        week_end = week_start + timedelta(days=6)
        
        # Generate base cache key for this week
        base_key = f"availability:{organizer_id}:*:{week_start}:{week_end}"
        cache_keys.append(base_key)
        
        # Move to next week
        current_date = week_end + timedelta(days=1)
    
    return list(set(cache_keys))  # Remove duplicates


def generate_cache_key_variations(base_key: str) -> List[str]:
    """Generate variations of a cache key for comprehensive invalidation."""
    variations = [base_key]
    
    # Add common timezone variations
    common_timezones = getattr(settings, 'AVAILABILITY_COMMON_TIMEZONES', ['UTC'])
    common_attendee_counts = getattr(settings, 'AVAILABILITY_COMMON_ATTENDEE_COUNTS', [1])
    
    for tz in common_timezones:
        for count in common_attendee_counts:
            variation = f"{base_key}:{tz}:{count}"
            variations.append(variation)
    
    return variations


def is_slot_blocked_by_override(
    organizer: User,
    event_type: 'EventType',
    slot: Dict[str, Any],
    target_date: date
) -> bool:
    """Check if a slot is blocked by date override rules."""
    from .models import DateOverrideRule
    
    # Get date overrides for the target date
    date_overrides = DateOverrideRule.objects.filter(
        organizer=organizer,
        date=target_date,
        is_active=True
    )
    
    # Filter overrides that apply to this event type
    applicable_overrides = [
        override for override in date_overrides
        if override.applies_to_event_type(event_type)
    ]
    
    if not applicable_overrides:
        return False
    
    slot_start = slot['start_time']
    slot_end = slot['end_time']
    
    for override in applicable_overrides:
        if not override.is_available:
            # Entire day is blocked
            return True
        
        if override.start_time and override.end_time:
            # Check if slot is within allowed time range
            override_start = datetime.combine(target_date, override.start_time)
            override_end = datetime.combine(target_date, override.end_time)
            
            # Handle midnight spanning
            if override.spans_midnight():
                override_end += timedelta(days=1)
            
            # Add timezone info to match slot times
            if slot_start.tzinfo:
                override_start = override_start.replace(tzinfo=slot_start.tzinfo)
                override_end = override_end.replace(tzinfo=slot_start.tzinfo)
            
            # Slot is blocked if it's OUTSIDE the allowed override range
            if not (override_start <= slot_start and slot_end <= override_end):
                return True
    
    return False