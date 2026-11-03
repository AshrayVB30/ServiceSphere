"""
Django Admin Configuration for the 'analytics' application.

Registers the performance management models (KRAs, KPIs, Assignments, Performance Records)
with rich tabular inlines, filtering, searching, and audit metadata display.
"""

# Import the standard Django admin framework
from django.contrib import admin

# Import the models defined in the analytics application
from .models import (
    KRA,
    KPI,
    KRAAssignment,
    KPIAssignment,
    KPIPerformanceRecord,
)


class KPIInline(admin.TabularInline):
    """
    Inline editor displaying KPIs directly within the parent KRA admin detail view.
    """
    # Specify the target model to embed inline
    model = KPI
    # Number of blank extra rows to show for quick additions
    extra = 1
    # Fields to expose in the compact tabular inline layout
    fields = ("name", "code", "metric_type", "target_direction", "default_target_value", "is_active")
    # Automatically generate slugified codes from names
    prepopulated_fields = {"code": ("name",)}


class KPIPerformanceRecordInline(admin.TabularInline):
    """
    Inline editor displaying historical performance evaluations inside the KPI Assignment view.
    """
    # Specify the target model to embed inline
    model = KPIPerformanceRecord
    # Do not pre-populate extra blank records unless explicitly requested
    extra = 0
    # Fields to expose in the tabular view
    fields = ("period_start", "period_end", "target_value", "actual_value", "achievement_percentage", "evaluated_by")
    # Make calculated achievement percentage read-only to prevent manual tampering
    readonly_fields = ("achievement_percentage",)


@admin.register(KRA)
class KRAAdmin(admin.ModelAdmin):
    """
    Administrative configuration for Key Result Areas (KRAs).
    """
    # Columns displayed in the primary change-list grid
    list_display = ("name", "code", "weightage", "is_active", "created_at")
    # Sidebar filters to narrow down KRAs
    list_filter = ("is_active", "created_at")
    # Searchable text columns
    search_fields = ("name", "code", "description", "measurable_objective")
    # Default ordering in change list
    ordering = ("name",)
    # Prepopulate the slug code from the name
    prepopulated_fields = {"code": ("name",)}
    # Embed child KPIs directly within the KRA detail form
    inlines = [KPIInline]


@admin.register(KPI)
class KPIAdmin(admin.ModelAdmin):
    """
    Administrative configuration for Key Performance Indicators (KPIs).
    """
    # Columns displayed in the primary change-list grid
    list_display = (
        "name",
        "code",
        "kra",
        "metric_type",
        "target_direction",
        "default_target_value",
        "evaluation_period",
        "is_active",
    )
    # Sidebar filters for efficient categorization
    list_filter = ("metric_type", "target_direction", "evaluation_period", "is_active", "kra")
    # Searchable text columns
    search_fields = ("name", "code", "description", "kra__name")
    # Default sorting order
    ordering = ("kra", "name")
    # Prepopulate the slug code from the name
    prepopulated_fields = {"code": ("name",)}


@admin.register(KRAAssignment)
class KRAAssignmentAdmin(admin.ModelAdmin):
    """
    Administrative configuration for agent KRA assignments.
    """
    # Columns displayed in the assignment grid
    list_display = ("kra", "agent", "assigned_by", "is_active", "created_at")
    # Sidebar filters
    list_filter = ("is_active", "kra", "created_at")
    # Search by agent username, email, or KRA title
    search_fields = ("agent__username", "agent__email", "kra__name")
    # Default sorting order
    ordering = ("-created_at",)
    # Optimize foreign key queries
    raw_id_fields = ("agent", "assigned_by")


@admin.register(KPIAssignment)
class KPIAssignmentAdmin(admin.ModelAdmin):
    """
    Administrative configuration for agent KPI assignments.
    """
    # Columns displayed in the assignment grid
    list_display = (
        "kpi",
        "agent",
        "effective_target_display",
        "custom_target_value",
        "assigned_by",
        "is_active",
        "created_at",
    )
    # Sidebar filters
    list_filter = ("is_active", "kpi__metric_type", "kpi__kra", "created_at")
    # Search by agent credentials or KPI title
    search_fields = ("agent__username", "agent__email", "kpi__name")
    # Default sorting order
    ordering = ("-created_at",)
    # Optimize foreign key lookups
    raw_id_fields = ("agent", "assigned_by")
    # Embed performance evaluation records inline
    inlines = [KPIPerformanceRecordInline]

    @admin.display(description="Effective Target")
    def effective_target_display(self, obj):
        """Displays either the custom target or inherited default target."""
        return obj.effective_target


@admin.register(KPIPerformanceRecord)
class KPIPerformanceRecordAdmin(admin.ModelAdmin):
    """
    Administrative configuration for KPI Performance Evaluation Records.
    """
    # Columns displayed in the performance record table
    list_display = (
        "assignment",
        "period_start",
        "period_end",
        "target_value",
        "actual_value",
        "achievement_percentage",
        "evaluated_by",
        "created_at",
    )
    # Sidebar filters
    list_filter = ("period_start", "period_end", "created_at")
    # Search by agent username or evaluated KPI name
    search_fields = ("assignment__agent__username", "assignment__kpi__name", "notes")
    # Default sorting
    ordering = ("-period_end", "-created_at")
    # Optimize foreign key lookups
    raw_id_fields = ("assignment", "evaluated_by")
    # Protect calculated achievement from manual tampering
    readonly_fields = ("achievement_percentage", "created_at")

