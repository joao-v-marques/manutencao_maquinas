from models.maintenance_models import MaintenanceModel

class MaintenanceService:
    @staticmethod
    def get_all():
        try:
            maintenances = MaintenanceModel.get_all()

            return maintenances
        except Exception as e:
            raise Exception(str(e))

    @staticmethod
    def get_by_id(equipment_id):
        try:
            maintenances = MaintenanceModel.get_by_id(equipment_id)

            return maintenances
        except Exception as e:
            raise Exception(str(e))