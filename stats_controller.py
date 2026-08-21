from app_admin.services.admin_service import AdminService
from shared.utils.response import api_response


class StatsController:

    @staticmethod
    def get_stats():

        stats = AdminService.get_dashboard_stats()

        if "error" in stats:
            return api_response(
                success=False,
                message="Dashboard stats failed",
                data=stats,
                status_code=500
            )

        return api_response(
            success=True,
            message="Dashboard stats fetched successfully",
            data=stats,
            status_code=200
        )