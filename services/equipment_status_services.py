from models.equipment_status_models import EquipmentStatusModel

class EquipmentStatusService:
    def get_all():
        try:
            equipment_status = EquipmentStatusModel.get_all()

            return equipment_status
        except Exception as e:
            raise Exception(str(e))
