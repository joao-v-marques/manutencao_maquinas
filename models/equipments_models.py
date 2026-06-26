from database.connect_db import get_db_connection

class Equipments:
    def __init__(self, name, type, brand, model, serial_number, acquisition_date, maintenance_interval_months, location, sector, status, maintenance_group, id=None, is_active=None, created_at=None, ip=None):
        self.name = name
        self.type = type
        self.brand = brand
        self.model = model
        self.serial_number = serial_number
        self.acquisition_date = acquisition_date
        self.ip = ip
        self.maintenance_interval_months = maintenance_interval_months
        self.location = location
        self.sector = sector
        self.status = status
        self.maintenance_group = maintenance_group
        self.id = id
        self.is_active = is_active
        self.created_at = created_at

    def to_dict(self):
        return {
            "name": self.name,
            "type": self.type,
            "brand": self.brand,
            "model": self.model,
            "serial_number": self.serial_number,
            "acquisition_date": self.acquisition_date,
            "ip": self.ip,
            "maintenance_interval_months": self.maintenance_interval_months,
            "location": self.location,
            "sector": self.sector,
            "status": self.status,
            "maintenance_group": self.maintenance_group,
            "id": self.id,
            "is_active": self.is_active,
            "created_at": self.created_at
        }

class EquipmentsModel:
    # GET de todos os equipamentos cadastrados
    @staticmethod
    def get_all():
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                SELECT 
                    e.id,
                    e.name,
                    e.type,
                    e.brand,
                    e.model,
                    e.serial_number,
                    e.acquisition_date,
                    e.ip,
                    e.maintenance_interval_months,
                    l.description as location,
                    s.description as sector,
                    es.description as status,
                    mg.description as maintenance_group,
                    e.is_active,
                    e.created_at
                FROM equipments e
                INNER JOIN sectors s ON s.id = e.sector_id
                INNER JOIN equipment_status es ON es.id = e.status_id
                INNER JOIN locations l ON l.id = location_id
                INNER JOIN maintenance_group mg ON mg.id = e.maintenance_group_id 
            """

            cursor.execute(sql_query)
            equipmentData = cursor.fetchall()

            # transforma cada dict do banco em objeto do model Users
            equipments = [
                Equipments(**equipment)
                for equipment in equipmentData
            ]
            
            return equipments
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    # GET de um unico equipamento pelo id
    @staticmethod
    def get_by_id(equipment_id):
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                SELECT 
                    e.id,
                    e.name,
                    e.type,
                    e.brand,
                    e.model,
                    e.serial_number,
                    e.acquisition_date,
                    e.ip,
                    e.maintenance_interval_months,
                    l.description as location,
                    s.description as sector,
                    es.description as status,
                    mg.description as maintenance_group,
                    e.is_active,
                    e.created_at
                FROM equipments e
                INNER JOIN sectors s ON s.id = e.sector_id
                INNER JOIN equipment_status es ON es.id = e.status_id
                INNER JOIN locations l ON l.id = location_id
                INNER JOIN maintenance_group mg ON mg.id = e.maintenance_group_id
                WHERE e.id = %s
            """
            values = (equipment_id,)

            cursor.execute(sql_query, values)
            equipmentData = cursor.fetchone()

            if not equipmentData:
                return None
            
            equipment = Equipments(**equipmentData)

            return equipment
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    # POST de todos os equipamentos cadastrados
    @staticmethod
    def create_equipment(equipment):
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                INSERT INTO equipments (
                    name, type, brand, model, serial_number, acquisition_date, ip, maintenance_interval_months, location_id, sector_id, status_id, maintenance_group_id
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """
            values = (equipment.name, equipment.type, equipment.brand, equipment.model, equipment.serial_number, equipment.acquisition_date, equipment.ip, equipment.maintenance_interval_months, equipment.location, equipment.sector, equipment.status, equipment.maintenance_group)

            cursor.execute(sql_query, values)
            conn.commit()

            created_equipment = equipment.to_dict()

            return created_equipment
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    # DELETE de um equipamento
    @staticmethod
    def delete_equipment(equipment_id):
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                DELETE FROM equipments e
                WHERE e.id = %s
            """
            values = (equipment_id,)

            cursor.execute(sql_query, values)
            conn.commit()

            return True
        except Exception as e:
            raise Exception(str(e))
        finally:
            if conn:
                conn.close()
            if cursor:
                cursor.close()