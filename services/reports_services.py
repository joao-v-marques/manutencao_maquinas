from models.equipments_models import EquipmentsModel
from utils.equipments_report import generate_equipments_report

class ReportsService:
    @staticmethod
    def generate_equipments_report(user_role, user_maintenance_group_id):
        try:
            equipments = EquipmentsModel.get_all(user_role, user_maintenance_group_id)

            equipment_data = [
                equipment.to_dict()
                for equipment in equipments
            ]

            return generate_equipments_report(equipment_data)
        except Exception as e:
            raise Exception(str(e))
