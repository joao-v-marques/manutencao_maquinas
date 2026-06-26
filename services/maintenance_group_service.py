from models.maintenance_group_models import MaintenanceGroupModel

class MaintenanceService:
    def get_all():
        try:
            maintenance_groups = MaintenanceGroupModel.get_all()

            return maintenance_groups
        except Exception as e:
            raise Exception(str(e))