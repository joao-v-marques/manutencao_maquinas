from models.equipments_models import EquipmentsModel, Equipments

class EquipmentsService:
    @staticmethod
    def get_all(user_role, user_maintenance_group_id):
        try:
            equipments = EquipmentsModel.get_all(user_role, user_maintenance_group_id)

            return equipments
        except Exception as e:
            raise Exception(str(e))

    @staticmethod
    def get_maintenance_status(user_role, user_maintenance_group_id):
        try:
            equipmentsStatus = EquipmentsModel.get_maintenance_status(user_role, user_maintenance_group_id)

            return equipmentsStatus
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

    @staticmethod
    def update_equipment(equipment_id, data):
        # COLOCAR VALIDAÇÕES DIVERSAS NOS CAMPOS

        equipment = Equipments(
            id=equipment_id,
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
            maintenance_group=data['maintenance_group']
        )

        updated_equipment = EquipmentsModel.update_equipment(equipment)

        return updated_equipment