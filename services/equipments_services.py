from models.equipments_models import EquipmentsModel, Equipments

class EquipmentsService:
    @staticmethod
    def get_all():
        try:
            equipments = EquipmentsModel.get_all()

            return equipments
        except Exception as e:
            raise Exception(str(e))
        
    @staticmethod
    def create_equipment(data):
        try:
            equipment = Equipments(
                name=data['name'],
                type=data['type'],
                brand=data['brand'],
                model=data['model'],
                serial_number=data['serial_number'],
                acquisition_date=data['acquisition_date'],
                ip=data['ip'],
                maintenance_interval_months=data['maintenance_interval_months'],
                location=data['location'],
                sector=data['sector'],
                status=data['status'],
                maintenance_group=data['maintenance_group'],
            )

            created_equipment = EquipmentsModel.create_equipment(equipment)

            return created_equipment
        except Exception as e:
            raise Exception(str(e))
        
    @staticmethod
    def delete_equipment(equipment_id):
        try:
            equipment = EquipmentsModel.get_by_id(equipment_id)

            if not equipment:
                raise ValueError("Não foi encontrado equipamento com esse ID")
            
            EquipmentsModel.delete_equipment(equipment_id)

            return True
        except Exception as e:
            raise Exception(str(e))

