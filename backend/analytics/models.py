"""
Database Models for the 'analytics' application.

Defines persistent models for Key Result Areas (KRAs) and Key Performance Indicators (KPIs):
1. KRA: Broad functional performance domain and objectives.
2. KPI: Granular, quantifiable metric tied to performance targets and evaluation periods.
3. KRAAssignment: Associates KRAs with support agents.
4. KPIAssignment: Associates KPIs with support agents, permitting customized targets.
5. KPIPerformanceRecord: Historical evaluation snapshots tracking actual vs. target achievements.

Ticket statistics, agent workload, and SLA metrics are computed dynamically from existing
Ticket and SLATracking models without data duplication.
"""

from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils.text import slugify


class KRA(models.Model):
    """
    Key Result Area (KRA) Model.

    Represents a strategic organizational focus area for support teams
    (e.g., 'Customer Satisfaction & Quality', 'Incident Resolution Velocity', 'SLA Compliance').
    """

    # Human-readable title of the Key Result Area
    name = models.CharField(
        max_length=150,
        unique=True,
        help_text="Name of the Key Result Area (e.g., 'Customer Satisfaction & Retention').",
    )

    # URL-friendly slug identifier
    code = models.SlugField(
        max_length=160,
        unique=True,
        db_index=True,
        help_text="Unique slugified code identifying this KRA (e.g., 'csat-quality').",
    )

    # Narrative explanation of the KRA's purpose
    description = models.TextField(
        blank=True,
        help_text="Detailed overview of what this result area entails.",
    )

    # Specific, tangible goal required to succeed in this result area
    measurable_objective = models.TextField(
        help_text="Specific measurable outcome defining success in this KRA.",
    )

    # Percentage weightage (0 to 100) determining the relative importance in annual/quarterly evaluations
    weightage = models.PositiveIntegerField(
        default=20,
        help_text="Relative percentage weightage of this KRA in overall performance appraisal (e.g. 25 for 25%).",
    )

    # Active status toggle
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Indicates whether this KRA is currently active.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the KRA was created.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the KRA was last updated.",
    )

    class Meta:
        verbose_name = "Key Result Area (KRA)"
        verbose_name_plural = "Key Result Areas (KRAs)"
        ordering = ["name"]

    def __str__(self):
        """String representation of KRA."""
        status_label = "Active" if self.is_active else "Inactive"
        return f"{self.name} ({self.weightage}% Weight - {status_label})"

    def save(self, *args, **kwargs):
        """Auto-populate slugified code if not provided."""
        if not self.code:
            self.code = slugify(self.name)
        super().save(*args, **kwargs)


class KPI(models.Model):
    """
    Key Performance Indicator (KPI) Model.

    Defines an operational metric with quantifiable target values, directionality,
    and evaluation frequency (e.g., 'First Response Time < 0.5 hours', 'Resolution Rate > 95%').
    """

    class MetricType(models.TextChoices):
        """Units of measurement for the KPI."""
        TIME_HOURS = "TIME_HOURS", "Time (Hours)"
        PERCENTAGE = "PERCENTAGE", "Percentage (%)"
        COUNT = "COUNT", "Count"
        RATING = "RATING", "Rating (1 to 5)"

    class TargetDirection(models.TextChoices):
        """Determines whether a higher or lower numerical value indicates better performance."""
        HIGHER_IS_BETTER = "HIGHER_IS_BETTER", "Higher is Better"  # e.g., Resolution Rate, CSAT
        LOWER_IS_BETTER = "LOWER_IS_BETTER", "Lower is Better"      # e.g., Average Response Time

    class EvaluationPeriod(models.TextChoices):
        """Cadence at which this KPI is formally measured and reviewed."""
        DAILY = "DAILY", "Daily"
        WEEKLY = "WEEKLY", "Weekly"
        MONTHLY = "MONTHLY", "Monthly"
        QUARTERLY = "QUARTERLY", "Quarterly"
        YEARLY = "YEARLY", "Yearly"

    # Optional parent KRA grouping
    kra = models.ForeignKey(
        KRA,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kpis",
        help_text="Key Result Area under which this KPI falls.",
    )

    # Name of the indicator
    name = models.CharField(
        max_length=150,
        unique=True,
        help_text="Name of the metric (e.g., 'Average First Response Time').",
    )

    # Unique uppercase metric code for API programmatic references
    code = models.SlugField(
        max_length=160,
        unique=True,
        db_index=True,
        help_text="Unique identifier code (e.g., 'FRT_HOURS', 'SLA_COMPLIANCE').",
    )

    description = models.TextField(
        blank=True,
        help_text="Detailed description of what this metric measures.",
    )

    # Unit of measurement
    metric_type = models.CharField(
        max_length=20,
        choices=MetricType.choices,
        default=MetricType.PERCENTAGE,
        help_text="Format/unit of measurement.",
    )

    # Directionality: determines how achievement is calculated
    target_direction = models.CharField(
        max_length=20,
        choices=TargetDirection.choices,
        default=TargetDirection.HIGHER_IS_BETTER,
        help_text="Whether exceeding or minimizing the target constitutes success.",
    )

    # Standard default baseline target
    default_target_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("90.00"),
        help_text="Default target threshold (e.g. 95.00 for 95%, 0.50 for 30 minutes).",
    )

    # Measurement frequency
    evaluation_period = models.CharField(
        max_length=20,
        choices=EvaluationPeriod.choices,
        default=EvaluationPeriod.MONTHLY,
        help_text="Measurement frequency.",
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this KPI is actively tracked.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the KPI was created.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the KPI was last modified.",
    )

    class Meta:
        verbose_name = "Key Performance Indicator (KPI)"
        verbose_name_plural = "Key Performance Indicators (KPIs)"
        ordering = ["name"]

    def __str__(self):
        """String representation of KPI."""
        return f"{self.name} [{self.get_metric_type_display()}] (Target: {self.default_target_value})"

    def save(self, *args, **kwargs):
        """Auto-populate slugified uppercase code if not provided."""
        if not self.code:
            self.code = slugify(self.name).replace("-", "_").upper()
        super().save(*args, **kwargs)


class KRAAssignment(models.Model):
    """
    Associates a Key Result Area with a Support Agent.
    """

    kra = models.ForeignKey(
        KRA,
        on_delete=models.CASCADE,
        related_name="assignments",
        help_text="Assigned Key Result Area.",
    )

    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="kra_assignments",
        help_text="Support agent responsible for this KRA.",
    )

    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_kra_assignments",
        help_text="Manager or administrator who assigned this KRA.",
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Indicates whether this assignment is currently active.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when assignment was made.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when assignment was last updated.",
    )

    class Meta:
        verbose_name = "KRA Assignment"
        verbose_name_plural = "KRA Assignments"
        unique_together = ("kra", "agent")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kra.name} -> {self.agent.username}"


class KPIAssignment(models.Model):
    """
    Associates a specific KPI with an individual Support Agent.
    Permits overriding the default target value for agent seniority or specialization.
    """

    kpi = models.ForeignKey(
        KPI,
        on_delete=models.CASCADE,
        related_name="assignments",
        help_text="Assigned Key Performance Indicator.",
    )

    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="kpi_assignments",
        help_text="Support agent evaluated against this KPI.",
    )

    # Optional override target (if None, kpi.default_target_value is used)
    custom_target_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Custom target specific to this agent (leave empty to inherit KPI default).",
    )

    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_kpi_assignments",
        help_text="Manager or administrator who assigned this KPI.",
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Indicates whether this assignment is currently active.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when assignment was made.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when assignment was last modified.",
    )

    class Meta:
        verbose_name = "KPI Assignment"
        verbose_name_plural = "KPI Assignments"
        unique_together = ("kpi", "agent")
        ordering = ["-created_at"]

    @property
    def effective_target(self):
        """Returns custom target if set, otherwise default KPI target."""
        if self.custom_target_value is not None:
            return self.custom_target_value
        return self.kpi.default_target_value

    def __str__(self):
        return f"{self.kpi.name} -> {self.agent.username} (Target: {self.effective_target})"


class KPIPerformanceRecord(models.Model):
    """
    Historical Evaluation Record for a KPI Assignment.

    Captures actual achieved values, calculated achievement percentage,
    and evaluator commentary for specific review periods (e.g. Month of October 2026).
    """

    assignment = models.ForeignKey(
        KPIAssignment,
        on_delete=models.CASCADE,
        related_name="performance_records",
        help_text="The KPI assignment being evaluated.",
    )

    period_start = models.DateField(
        help_text="Start date of the evaluation window.",
    )

    period_end = models.DateField(
        help_text="End date of the evaluation window.",
    )

    target_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Target value expected for this evaluation period.",
    )

    actual_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Actual numerical metric achieved by the agent during the period.",
    )

    achievement_percentage = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        help_text="Calculated achievement score percentage.",
    )

    notes = models.TextField(
        blank=True,
        help_text="Evaluator feedback, operational context, or review notes.",
    )

    evaluated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evaluated_kpi_records",
        help_text="Manager or system evaluator who generated this performance record.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when this performance evaluation was recorded.",
    )

    class Meta:
        verbose_name = "KPI Performance Record"
        verbose_name_plural = "KPI Performance Records"
        ordering = ["-period_end"]

    def __str__(self):
        return (
            f"{self.assignment.agent.username} - {self.assignment.kpi.name} "
            f"({self.period_start} to {self.period_end}): {self.achievement_percentage}%"
        )

