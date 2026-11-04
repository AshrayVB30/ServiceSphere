"""
Business Logic and Analytics Services for the 'analytics' application.

Provides modular, highly optimized analytical routines for:
1. Ticket Analytics: Real-time summaries, status breakdowns, priority/category distributions, and timelines.
2. Agent Performance: Workload distribution, response/resolution velocity, and leaderboards.
3. SLA Analytics: Compliance ratios, breach counts, overdue tickets, and priority/agent breakdowns.
4. KPI & KRA Evaluation: Direction-aware achievement percentages, automated metrics, and weighted scorecards.
5. Export Services: Dynamic streaming CSV report generation with decimal and date formatting.

Zero-division guards and timezone-aware boundaries are applied throughout.
"""

# Import native Python CSV generator for report streaming
import csv
# Import datetime utilities and date arithmetic
from datetime import datetime, time, timedelta
# Import Decimal for monetary and percentage numerical precision
from decimal import Decimal, ROUND_HALF_UP
# Import IO stream buffer for CSV generation
import io

# Import Django database query primitives and aggregation functions
from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, Q, Sum
from django.db.models.functions import TruncDate
# Import Django HTTP response for download generation
from django.http import HttpResponse
# Import timezone utilities to maintain UTC/local time consistency
from django.utils import timezone

# Import account User model to reference support agents
from accounts.models import User
# Import ticket models to evaluate operational volumes
from tickets.models import Ticket
# Import SLA tracking models to evaluate service level adherence
from sla.models import SLATracking
# Import local analytics models
from .models import (
    KRA,
    KPI,
    KRAAssignment,
    KPIAssignment,
    KPIPerformanceRecord,
)


def parse_date_boundaries(start_date_str=None, end_date_str=None):
    """
    Parses string date inputs ('YYYY-MM-DD') into timezone-aware start and end datetime bounds.
    If no dates are provided, defaults to all-time or sensible defaults.
    """
    start_dt = None
    end_dt = None

    if start_date_str:
        try:
            # Parse start date string into date object
            parsed_start = datetime.strptime(str(start_date_str).strip(), "%Y-%m-%d").date()
            # Set to beginning of the day (00:00:00) in current timezone
            start_dt = timezone.make_aware(datetime.combine(parsed_start, time.min))
        except (ValueError, TypeError):
            start_dt = None

    if end_date_str:
        try:
            # Parse end date string into date object
            parsed_end = datetime.strptime(str(end_date_str).strip(), "%Y-%m-%d").date()
            # Set to end of the day (23:59:59.999999) in current timezone
            end_dt = timezone.make_aware(datetime.combine(parsed_end, time.max))
        except (ValueError, TypeError):
            end_dt = None

    return start_dt, end_dt


# ==============================================================================
# 1. TICKET ANALYTICS SERVICES
# ==============================================================================

def get_ticket_summary(start_date=None, end_date=None):
    """
    Computes global ticket counts, status breakdowns, and active volume.
    Supports optional date filtering by ticket creation date.
    """
    # Parse date parameters
    start_dt, end_dt = parse_date_boundaries(start_date, end_date)

    # Base queryset
    qs = Ticket.objects.all()
    if start_dt:
        qs = qs.filter(created_at__gte=start_dt)
    if end_dt:
        qs = qs.filter(created_at__lte=end_dt)

    # Total count in period
    total_tickets = qs.count()

    # Aggregate count per lifecycle status
    status_counts = qs.aggregate(
        open_count=Count("id", filter=Q(status=Ticket.Status.OPEN)),
        in_progress_count=Count("id", filter=Q(status=Ticket.Status.IN_PROGRESS)),
        awaiting_customer_count=Count("id", filter=Q(status=Ticket.Status.AWAITING_CUSTOMER)),
        resolved_count=Count("id", filter=Q(status=Ticket.Status.RESOLVED)),
        closed_count=Count("id", filter=Q(status=Ticket.Status.CLOSED)),
    )

    # Active pending tickets (open, in-progress, awaiting customer)
    active_count = (
        status_counts["open_count"]
        + status_counts["in_progress_count"]
        + status_counts["awaiting_customer_count"]
    )

    # Completed tickets (resolved or closed)
    completed_count = status_counts["resolved_count"] + status_counts["closed_count"]

    # Calculate completion rate percentage with zero-division guard
    completion_rate = (
        round((Decimal(completed_count) / Decimal(total_tickets)) * Decimal(100), 2)
        if total_tickets > 0
        else Decimal("0.00")
    )

    return {
        "total_tickets": total_tickets,
        "active_tickets": active_count,
        "completed_tickets": completed_count,
        "completion_rate_percentage": float(completion_rate),
        "status_breakdown": {
            "open": status_counts["open_count"],
            "in_progress": status_counts["in_progress_count"],
            "awaiting_customer": status_counts["awaiting_customer_count"],
            "resolved": status_counts["resolved_count"],
            "closed": status_counts["closed_count"],
        },
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
    }


def get_tickets_by_priority(start_date=None, end_date=None):
    """
    Groups tickets by priority level (LOW, MEDIUM, HIGH, URGENT)
    and computes count and proportion percentage.
    """
    start_dt, end_dt = parse_date_boundaries(start_date, end_date)
    qs = Ticket.objects.all()
    if start_dt:
        qs = qs.filter(created_at__gte=start_dt)
    if end_dt:
        qs = qs.filter(created_at__lte=end_dt)

    total_count = qs.count()
    priority_counts = (
        qs.values("priority")
        .annotate(count=Count("id"))
        .order_by("priority")
    )

    result = []
    # Map raw priority values to clean response list
    for entry in priority_counts:
        p_val = entry["priority"]
        count = entry["count"]
        pct = (
            round((Decimal(count) / Decimal(total_count)) * Decimal(100), 2)
            if total_count > 0
            else Decimal("0.00")
        )
        result.append({
            "priority": p_val,
            "priority_display": dict(Ticket.Priority.choices).get(p_val, p_val),
            "count": count,
            "percentage": float(pct),
        })

    return result


def get_tickets_by_category(start_date=None, end_date=None):
    """
    Groups tickets by functional category (e.g. 'Billing', 'Technical', 'General')
    and computes count and percentage.
    """
    start_dt, end_dt = parse_date_boundaries(start_date, end_date)
    qs = Ticket.objects.all()
    if start_dt:
        qs = qs.filter(created_at__gte=start_dt)
    if end_dt:
        qs = qs.filter(created_at__lte=end_dt)

    total_count = qs.count()
    category_counts = (
        qs.values("category")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    result = []
    for entry in category_counts:
        cat_name = entry["category"] or "Uncategorized"
        count = entry["count"]
        pct = (
            round((Decimal(count) / Decimal(total_count)) * Decimal(100), 2)
            if total_count > 0
            else Decimal("0.00")
        )
        result.append({
            "category": cat_name,
            "count": count,
            "percentage": float(pct),
        })

    return result


def get_ticket_trends(start_date=None, end_date=None):
    """
    Aggregates tickets created and tickets resolved grouped by day.
    Provides timeline analytics for charts and dashboards.
    """
    start_dt, end_dt = parse_date_boundaries(start_date, end_date)

    # Base query for created tickets
    created_qs = Ticket.objects.all()
    if start_dt:
        created_qs = created_qs.filter(created_at__gte=start_dt)
    if end_dt:
        created_qs = created_qs.filter(created_at__lte=end_dt)

    created_by_date = (
        created_qs.annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(created_count=Count("id"))
        .order_by("date")
    )

    # Base query for resolved tickets
    resolved_qs = Ticket.objects.filter(resolved_at__isnull=False)
    if start_dt:
        resolved_qs = resolved_qs.filter(resolved_at__gte=start_dt)
    if end_dt:
        resolved_qs = resolved_qs.filter(resolved_at__lte=end_dt)

    resolved_by_date = (
        resolved_qs.annotate(date=TruncDate("resolved_at"))
        .values("date")
        .annotate(resolved_count=Count("id"))
        .order_by("date")
    )

    # Combine created and resolved metrics into unified timeline dictionary
    timeline = {}
    for item in created_by_date:
        d_str = str(item["date"])
        timeline[d_str] = {
            "date": d_str,
            "created_count": item["created_count"],
            "resolved_count": 0,
        }

    for item in resolved_by_date:
        d_str = str(item["date"])
        if d_str in timeline:
            timeline[d_str]["resolved_count"] = item["resolved_count"]
        else:
            timeline[d_str] = {
                "date": d_str,
                "created_count": 0,
                "resolved_count": item["resolved_count"],
            }

    # Sort timeline sequentially by date
    sorted_timeline = sorted(timeline.values(), key=lambda x: x["date"])
    return sorted_timeline


# ==============================================================================
# 2. AGENT PERFORMANCE ANALYTICS SERVICES
# ==============================================================================

def get_agent_performance(agent_id, start_date=None, end_date=None):
    """
    Calculates detailed performance scorecard for a specific support agent:
    - Total tickets assigned
    - Resolved tickets count
    - Pending ticket backlog
    - Average first response time (in hours)
    - Average resolution time (in hours)
    - SLA compliance rate percentage
    """
    # Fetch agent instance
    try:
        agent = User.objects.get(id=agent_id, role=User.Role.SUPPORT_AGENT)
    except User.DoesNotExist:
        return None

    start_dt, end_dt = parse_date_boundaries(start_date, end_date)

    # Filter tickets assigned to this agent
    tickets_qs = Ticket.objects.filter(assigned_to=agent)
    if start_dt:
        tickets_qs = tickets_qs.filter(created_at__gte=start_dt)
    if end_dt:
        tickets_qs = tickets_qs.filter(created_at__lte=end_dt)

    total_assigned = tickets_qs.count()

    # Count resolved/closed tickets
    resolved_count = tickets_qs.filter(status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]).count()

    # Count pending tickets
    pending_count = tickets_qs.filter(
        status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS, Ticket.Status.AWAITING_CUSTOMER]
    ).count()

    # Resolution rate percentage
    resolution_rate = (
        round((Decimal(resolved_count) / Decimal(total_assigned)) * Decimal(100), 2)
        if total_assigned > 0
        else Decimal("0.00")
    )

    # Calculate average first response time in hours from SLA tracking
    # NOTE: Durations are computed in Python rather than via database Avg(ExpressionWrapper(...))
    # because cross-field duration arithmetic varies across DB engines and timezone handling.
    # This approach is accurate but loads all responded tracking rows into memory.
    # For deployments with > ~10,000 tracked tickets per agent, consider migrating to
    # a database-level aggregation using ExpressionWrapper + DurationField (see Django docs).
    resp_qs = SLATracking.objects.filter(
        ticket__assigned_to=agent,
        actual_response_at__isnull=False,
    )
    if start_dt:
        resp_qs = resp_qs.filter(ticket__created_at__gte=start_dt)
    if end_dt:
        resp_qs = resp_qs.filter(ticket__created_at__lte=end_dt)

    # Compute duration differences
    resp_durations = [
        (t.actual_response_at - t.ticket.created_at).total_seconds() / 3600.0
        for t in resp_qs.select_related("ticket")
        if t.actual_response_at and t.ticket and t.actual_response_at >= t.ticket.created_at
    ]
    avg_first_response_hours = (
        round(Decimal(sum(resp_durations)) / Decimal(len(resp_durations)), 2)
        if resp_durations
        else None
    )

    # Calculate average resolution time in hours
    res_qs = tickets_qs.filter(resolved_at__isnull=False)
    res_durations = [
        (t.resolved_at - t.created_at).total_seconds() / 3600.0
        for t in res_qs
        if t.resolved_at and t.resolved_at >= t.created_at
    ]
    avg_resolution_hours = (
        round(Decimal(sum(res_durations)) / Decimal(len(res_durations)), 2)
        if res_durations
        else None
    )

    # Calculate SLA compliance for this agent's tickets
    agent_sla_qs = SLATracking.objects.filter(ticket__assigned_to=agent)
    if start_dt:
        agent_sla_qs = agent_sla_qs.filter(ticket__created_at__gte=start_dt)
    if end_dt:
        agent_sla_qs = agent_sla_qs.filter(ticket__created_at__lte=end_dt)

    sla_total = agent_sla_qs.count()
    sla_breached = agent_sla_qs.filter(
        Q(response_status=SLATracking.SLAStatus.BREACHED)
        | Q(resolution_status=SLATracking.SLAStatus.BREACHED)
    ).count()
    sla_compliant = sla_total - sla_breached

    sla_compliance_rate = (
        round((Decimal(sla_compliant) / Decimal(sla_total)) * Decimal(100), 2)
        if sla_total > 0
        else Decimal("100.00")
    )

    return {
        "agent_id": agent.id,
        "username": agent.username,
        "full_name": agent.get_full_name() or agent.username,
        "email": agent.email,
        "total_assigned": total_assigned,
        "resolved_tickets": resolved_count,
        "pending_tickets": pending_count,
        "resolution_rate_percentage": float(resolution_rate),
        "avg_first_response_hours": float(avg_first_response_hours) if avg_first_response_hours is not None else None,
        "avg_resolution_hours": float(avg_resolution_hours) if avg_resolution_hours is not None else None,
        "sla_governed_tickets": sla_total,
        "sla_compliant_tickets": sla_compliant,
        "sla_breached_tickets": sla_breached,
        "sla_compliance_rate_percentage": float(sla_compliance_rate),
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
    }


def get_agent_leaderboard(start_date=None, end_date=None):
    """
    Retrieves performance metrics across all active support agents for leaderboard ranking,
    comparison, and workload distribution analysis.
    """
    agents = User.objects.filter(role=User.Role.SUPPORT_AGENT, is_active=True).order_by("username")
    leaderboard = []

    # Retrieve the global active ticket count for workload share calculations.
    # NOTE: The loop below calls get_agent_performance() once per active agent (O(N) agent queries,
    # each comprising ~5 sub-queries). This is efficient for support teams of < ~50 agents.
    # For significantly larger teams, consider refactoring to a single annotated QuerySet.
    total_active_tickets = Ticket.objects.filter(
        status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS, Ticket.Status.AWAITING_CUSTOMER]
    ).count()

    for agent in agents:
        metrics = get_agent_performance(agent.id, start_date, end_date)
        if metrics:
            # Calculate workload share percentage
            workload_pct = (
                round((Decimal(metrics["pending_tickets"]) / Decimal(total_active_tickets)) * Decimal(100), 2)
                if total_active_tickets > 0
                else Decimal("0.00")
            )
            metrics["workload_distribution_percentage"] = float(workload_pct)
            leaderboard.append(metrics)

    # Sort leaderboard by resolved tickets (descending), then resolution rate (descending)
    leaderboard.sort(
        key=lambda x: (x["resolved_tickets"], x["resolution_rate_percentage"]),
        reverse=True,
    )

    return {
        "agents_count": len(leaderboard),
        "total_active_workload": total_active_tickets,
        "leaderboard": leaderboard,
    }


# ==============================================================================
# 3. SLA ANALYTICS SERVICES
# ==============================================================================

def get_sla_summary(start_date=None, end_date=None):
    """
    Aggregates SLA compliance, breach statistics, overdue volume,
    and average response/resolution duration metrics.
    """
    start_dt, end_dt = parse_date_boundaries(start_date, end_date)

    qs = SLATracking.objects.select_related("ticket", "policy")
    if start_dt:
        qs = qs.filter(ticket__created_at__gte=start_dt)
    if end_dt:
        qs = qs.filter(ticket__created_at__lte=end_dt)

    total_governed = qs.count()

    # Breached count: either response or resolution breached
    breached_count = qs.filter(
        Q(response_status=SLATracking.SLAStatus.BREACHED)
        | Q(resolution_status=SLATracking.SLAStatus.BREACHED)
    ).count()

    # Compliant count
    compliant_count = total_governed - breached_count

    # Compliance percentage
    compliance_percentage = (
        round((Decimal(compliant_count) / Decimal(total_governed)) * Decimal(100), 2)
        if total_governed > 0
        else Decimal("100.00")
    )

    # Response SLA breakdown
    response_stats = qs.aggregate(
        resp_within=Count("id", filter=Q(response_status=SLATracking.SLAStatus.WITHIN_SLA)),
        resp_approaching=Count("id", filter=Q(response_status=SLATracking.SLAStatus.APPROACHING)),
        resp_breached=Count("id", filter=Q(response_status=SLATracking.SLAStatus.BREACHED)),
        resp_completed=Count("id", filter=Q(response_status=SLATracking.SLAStatus.COMPLETED)),
    )

    # Resolution SLA breakdown
    resolution_stats = qs.aggregate(
        res_within=Count("id", filter=Q(resolution_status=SLATracking.SLAStatus.WITHIN_SLA)),
        res_approaching=Count("id", filter=Q(resolution_status=SLATracking.SLAStatus.APPROACHING)),
        res_breached=Count("id", filter=Q(resolution_status=SLATracking.SLAStatus.BREACHED)),
        res_completed=Count("id", filter=Q(resolution_status=SLATracking.SLAStatus.COMPLETED)),
    )

    # Overdue tickets: Unresolved tickets where resolution_deadline < current timestamp
    now = timezone.now()
    overdue_count = qs.filter(
        ticket__status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS, Ticket.Status.AWAITING_CUSTOMER],
        resolution_deadline__lt=now,
    ).count()

    # Average response duration in hours across all responded tickets.
    # NOTE: Same Python-side duration arithmetic as get_agent_performance().
    # Acceptable for typical helpdesk volumes (< ~50,000 total SLA-tracked tickets).
    resp_durations = [
        (t.actual_response_at - t.ticket.created_at).total_seconds() / 3600.0
        for t in qs
        if t.actual_response_at and t.ticket and t.actual_response_at >= t.ticket.created_at
    ]
    avg_response_hours = (
        round(Decimal(sum(resp_durations)) / Decimal(len(resp_durations)), 2)
        if resp_durations
        else None
    )

    # Average resolution duration in hours across all resolved tickets
    res_durations = [
        (t.actual_resolution_at - t.ticket.created_at).total_seconds() / 3600.0
        for t in qs
        if t.actual_resolution_at and t.ticket and t.actual_resolution_at >= t.ticket.created_at
    ]
    avg_resolution_hours = (
        round(Decimal(sum(res_durations)) / Decimal(len(res_durations)), 2)
        if res_durations
        else None
    )

    return {
        "total_governed_tickets": total_governed,
        "compliant_tickets": compliant_count,
        "breached_tickets": breached_count,
        "compliance_percentage": float(compliance_percentage),
        "overdue_tickets_count": overdue_count,
        "avg_response_time_hours": float(avg_response_hours) if avg_response_hours is not None else None,
        "avg_resolution_time_hours": float(avg_resolution_hours) if avg_resolution_hours is not None else None,
        "response_breakdown": {
            "within_sla": response_stats["resp_within"],
            "approaching": response_stats["resp_approaching"],
            "breached": response_stats["resp_breached"],
            "completed": response_stats["resp_completed"],
        },
        "resolution_breakdown": {
            "within_sla": resolution_stats["res_within"],
            "approaching": resolution_stats["res_approaching"],
            "breached": resolution_stats["res_breached"],
            "completed": resolution_stats["res_completed"],
        },
        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },
    }


def get_sla_breakdown_by_priority(start_date=None, end_date=None):
    """
    Computes SLA compliance counts and percentages grouped by ticket priority.
    """
    start_dt, end_dt = parse_date_boundaries(start_date, end_date)
    qs = SLATracking.objects.select_related("ticket")
    if start_dt:
        qs = qs.filter(ticket__created_at__gte=start_dt)
    if end_dt:
        qs = qs.filter(ticket__created_at__lte=end_dt)

    result = []
    for priority_code, priority_label in Ticket.Priority.choices:
        p_qs = qs.filter(ticket__priority=priority_code)
        p_total = p_qs.count()
        p_breached = p_qs.filter(
            Q(response_status=SLATracking.SLAStatus.BREACHED)
            | Q(resolution_status=SLATracking.SLAStatus.BREACHED)
        ).count()
        p_compliant = p_total - p_breached
        p_pct = (
            round((Decimal(p_compliant) / Decimal(p_total)) * Decimal(100), 2)
            if p_total > 0
            else Decimal("100.00")
        )
        result.append({
            "priority": priority_code,
            "priority_display": priority_label,
            "total_tickets": p_total,
            "compliant_tickets": p_compliant,
            "breached_tickets": p_breached,
            "compliance_percentage": float(p_pct),
        })

    return result


def get_sla_breakdown_by_agent(start_date=None, end_date=None):
    """
    Computes SLA compliance counts and percentages grouped by assigned support agent.
    """
    start_dt, end_dt = parse_date_boundaries(start_date, end_date)
    agents = User.objects.filter(role=User.Role.SUPPORT_AGENT, is_active=True).order_by("username")
    result = []

    for agent in agents:
        a_qs = SLATracking.objects.filter(ticket__assigned_to=agent)
        if start_dt:
            a_qs = a_qs.filter(ticket__created_at__gte=start_dt)
        if end_dt:
            a_qs = a_qs.filter(ticket__created_at__lte=end_dt)

        a_total = a_qs.count()
        a_breached = a_qs.filter(
            Q(response_status=SLATracking.SLAStatus.BREACHED)
            | Q(resolution_status=SLATracking.SLAStatus.BREACHED)
        ).count()
        a_compliant = a_total - a_breached
        a_pct = (
            round((Decimal(a_compliant) / Decimal(a_total)) * Decimal(100), 2)
            if a_total > 0
            else Decimal("100.00")
        )

        result.append({
            "agent_id": agent.id,
            "username": agent.username,
            "full_name": agent.get_full_name() or agent.username,
            "total_governed_tickets": a_total,
            "compliant_tickets": a_compliant,
            "breached_tickets": a_breached,
            "compliance_percentage": float(a_pct),
        })

    return result


def get_sla_breaches(start_date=None, end_date=None):
    """
    Returns granular list of all tickets that breached their SLA deadlines,
    including priority, assigned agent, response and resolution breach statuses.
    """
    start_dt, end_dt = parse_date_boundaries(start_date, end_date)
    qs = SLATracking.objects.filter(
        Q(response_status=SLATracking.SLAStatus.BREACHED)
        | Q(resolution_status=SLATracking.SLAStatus.BREACHED)
    ).select_related("ticket", "ticket__assigned_to", "ticket__client", "policy")

    if start_dt:
        qs = qs.filter(ticket__created_at__gte=start_dt)
    if end_dt:
        qs = qs.filter(ticket__created_at__lte=end_dt)

    breaches = []
    for item in qs:
        ticket = item.ticket
        breaches.append({
            "ticket_id": ticket.id,
            "ticket_number": str(ticket.ticket_number),
            "subject": ticket.subject,
            "client_name": ticket.client.name if ticket.client else None,
            "priority": ticket.priority,
            "status": ticket.status,
            "assigned_to": ticket.assigned_to.username if ticket.assigned_to else None,
            "response_status": item.response_status,
            "resolution_status": item.resolution_status,
            "response_deadline": item.response_deadline.isoformat() if item.response_deadline else None,
            "actual_response_at": item.actual_response_at.isoformat() if item.actual_response_at else None,
            "resolution_deadline": item.resolution_deadline.isoformat() if item.resolution_deadline else None,
            "actual_resolution_at": item.actual_resolution_at.isoformat() if item.actual_resolution_at else None,
            "created_at": ticket.created_at.isoformat(),
        })

    return breaches


# ==============================================================================
# 4. KPI & KRA CALCULATION SERVICES
# ==============================================================================

def calculate_kpi_achievement(target_value, actual_value, target_direction):
    """
    Calculates the achievement percentage based on target directionality:
    - HIGHER_IS_BETTER: (actual / target) * 100
    - LOWER_IS_BETTER: (target / actual) * 100 (if actual <= target, achieved 100%+; if actual == 0, 100%)
    - EXACT_MATCH: 100% if equal, decreasing by deviation percentage.

    Protected with Decimal arithmetic and ZeroDivision guards.
    """
    # Convert inputs to Decimal safely
    try:
        target = Decimal(str(target_value))
        actual = Decimal(str(actual_value))
    except (ValueError, TypeError):
        return Decimal("0.00")

    # Guard: If target is zero
    if target == Decimal("0.00"):
        if actual == Decimal("0.00"):
            return Decimal("100.00")
        return Decimal("100.00") if target_direction == KPI.TargetDirection.LOWER_IS_BETTER and actual <= 0 else Decimal("0.00")

    if target_direction == KPI.TargetDirection.HIGHER_IS_BETTER:
        # Higher is better: standard actual/target ratio
        achievement = (actual / target) * Decimal("100.00")
        return achievement.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    elif target_direction == KPI.TargetDirection.LOWER_IS_BETTER:
        # Lower is better (e.g. response time, error rate):
        if actual <= Decimal("0.00"):
            # If zero errors or immediate response, target is fully met/exceeded
            return Decimal("100.00")
        achievement = (target / actual) * Decimal("100.00")
        return achievement.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    elif target_direction == KPI.TargetDirection.EXACT_MATCH:
        # Exact match: 100% minus deviation
        deviation = abs(actual - target)
        achievement = max(Decimal("0.00"), Decimal("100.00") - (deviation / target) * Decimal("100.00"))
        return achievement.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Fallback default
    return Decimal("0.00")


def evaluate_agent_kpis(agent_id, period_start, period_end, evaluated_by=None, save_records=True):
    """
    Evaluates all active KPI assignments for a support agent over a review period.
    Automatically calculates actual values for standard metric types from tickets and SLA logs:
    - RESOLUTION_RATE: Percentage of assigned tickets resolved.
    - AVG_RESOLUTION_HOURS: Average resolution duration in hours.
    - AVG_FIRST_RESPONSE_HOURS: Average first response time in hours.
    - TICKETS_RESOLVED_COUNT: Total resolved ticket volume.
    - SLA_COMPLIANCE_RATE: SLA compliance percentage.
    For custom/manual KPIs, maintains current or supplied values.
    """
    try:
        agent = User.objects.get(id=agent_id, role=User.Role.SUPPORT_AGENT)
    except User.DoesNotExist:
        return None

    # Retrieve active KPI assignments for this agent
    assignments = KPIAssignment.objects.filter(agent=agent, is_active=True).select_related("kpi", "kpi__kra")
    # Retrieve performance stats for the period
    start_str = str(period_start)
    end_str = str(period_end)
    agent_stats = get_agent_performance(agent.id, start_str, end_str)

    evaluated_records = []

    for assignment in assignments:
        kpi = assignment.kpi
        target_val = assignment.effective_target
        actual_val = Decimal("0.00")

        # Automatically determine actual value if standard metric
        metric_code = kpi.code.upper()
        if "RESOLUTION_RATE" in metric_code:
            actual_val = Decimal(str(agent_stats["resolution_rate_percentage"])) if agent_stats else Decimal("0.00")
        elif "AVG_RESOLUTION" in metric_code or "RESOLUTION_TIME" in metric_code:
            actual_val = Decimal(str(agent_stats["avg_resolution_hours"] or 0)) if agent_stats else Decimal("0.00")
        elif "AVG_RESPONSE" in metric_code or "RESPONSE_TIME" in metric_code:
            actual_val = Decimal(str(agent_stats["avg_first_response_hours"] or 0)) if agent_stats else Decimal("0.00")
        elif "RESOLVED" in metric_code and "COUNT" in metric_code:
            actual_val = Decimal(str(agent_stats["resolved_tickets"])) if agent_stats else Decimal("0.00")
        elif "SLA" in metric_code:
            actual_val = Decimal(str(agent_stats["sla_compliance_rate_percentage"])) if agent_stats else Decimal("0.00")
        else:
            # Check if there is an existing record for this assignment in this period
            existing = KPIPerformanceRecord.objects.filter(
                assignment=assignment,
                period_start=period_start,
                period_end=period_end,
            ).first()
            if existing:
                actual_val = existing.actual_value

        # Calculate achievement percentage
        achievement_pct = calculate_kpi_achievement(
            target_value=target_val,
            actual_value=actual_val,
            target_direction=kpi.target_direction,
        )

        record_obj = None
        if save_records:
            # Create or update persistent performance record
            record_obj, _ = KPIPerformanceRecord.objects.update_or_create(
                assignment=assignment,
                period_start=period_start,
                period_end=period_end,
                defaults={
                    "target_value": target_val,
                    "actual_value": actual_val,
                    "achievement_percentage": achievement_pct,
                    "evaluated_by": evaluated_by,
                    "notes": f"Automated performance evaluation generated on {timezone.now().date()}",
                },
            )

        evaluated_records.append({
            "kpi_id": kpi.id,
            "kpi_name": kpi.name,
            "kpi_code": kpi.code,
            "kra_name": kpi.kra.name,
            "target_value": float(target_val),
            "actual_value": float(actual_val),
            "target_direction": kpi.target_direction,
            "achievement_percentage": float(achievement_pct),
            "record_id": record_obj.id if record_obj else None,
        })

    # Calculate overall weighted average score across all KRAs
    kra_scores = {}
    for item in evaluated_records:
        k_name = item["kra_name"]
        if k_name not in kra_scores:
            kra_scores[k_name] = []
        kra_scores[k_name].append(item["achievement_percentage"])

    kra_summary = []
    for k_name, ach_list in kra_scores.items():
        avg_ach = sum(ach_list) / len(ach_list) if ach_list else 0.0
        kra_summary.append({
            "kra_name": k_name,
            "average_achievement_percentage": round(avg_ach, 2),
            "kpis_evaluated": len(ach_list),
        })

    return {
        "agent_id": agent.id,
        "username": agent.username,
        "period_start": str(period_start),
        "period_end": str(period_end),
        "kpis_evaluated_count": len(evaluated_records),
        "kpi_records": evaluated_records,
        "kra_summary": kra_summary,
    }


# ==============================================================================
# 5. CSV EXPORT UTILITIES
# ==============================================================================

def export_to_csv(data_rows, fieldnames, filename="report.csv"):
    """
    Renders a list of dictionaries into an RFC 4180 compliant CSV HTTP streaming response.
    Configures appropriate headers for direct browser attachment download.
    """
    # Create an in-memory string buffer
    output = io.StringIO()
    # Initialize standard DictWriter
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")

    # Write the column headers row
    writer.writeheader()

    # Write each row into the CSV buffer
    for row in data_rows:
        writer.writerow(row)

    # Rewind buffer to start
    output.seek(0)

    # Initialize streaming HTTP response with text/csv mime type
    response = HttpResponse(output.getvalue(), content_type="text/csv; charset=utf-8")
    # Attach download header
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response

