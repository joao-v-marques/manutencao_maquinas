from models.equipments_models import EquipmentsModel

class EquipmentsService:
    @staticmethod
    def get_all():
        try:
            equipments = EquipmentsModel.get_all()

            return equipments
        except Exception as e:
            raise Exception(str(e))