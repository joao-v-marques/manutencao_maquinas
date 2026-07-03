from models.maintenance_models import MaintenanceModel, Maintenance

class MaintenanceService:
    @staticmethod
    def get_all(user_role, user_maintenance_group_id):
        try:
            maintenances = MaintenanceModel.get_all(user_role, user_maintenance_group_id)

            return maintenances
        except Exception as e:
            raise Exception(str(e))

    @staticmethod
    def get_by_id(equipment_id, user_role, user_maintenance_group_id):
        try:
            maintenances = MaintenanceModel.get_by_id(equipment_id, user_role, user_maintenance_group_id)

            return maintenances
        except Exception as e:
            raise Exception(str(e))
        
    @staticmethod
    def create_maintenance(data):
        try:
            maintenance = Maintenance(
                maintenance_date=data['maintenance_date'],
                next_maintenance_date=data['next_maintenance_date'],
                description=data['description'],
                user=data['user_id'],
                equipment=data['equipment_id']
            )

            created_maintenance = MaintenanceModel.create_maintenance(maintenance)

            return created_maintenance
        except Exception as e:
            raise Exception(str(e))