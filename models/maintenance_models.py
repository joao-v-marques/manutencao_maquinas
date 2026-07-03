from database.connect_db import get_db_connection

class Maintenance:
    def __init__(self, maintenance_date, next_maintenance_date, description, user, equipment, id=None):
        self.id = id
        self.maintenance_date = maintenance_date
        self.next_maintenance_date = next_maintenance_date
        self.description = description
        self.user = user
        self.equipment = equipment

    def to_dict(self):
        return {
            "id": self.id,
            "maintenance_date": self.maintenance_date,
            "next_maintenance_date": self.next_maintenance_date,
            "description": self.description,
            "user": self.user,
            "equipment": self.equipment
        }
    
class MaintenanceModel:
    # GET de todas as manutenções cadastradas no sistema
    @staticmethod
    def get_all(user_role, user_maintenance_group_id):
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                SELECT m.id, m.maintenance_date, m.next_maintenance_date, m.description, u.username AS user, e.name AS equipment 
                FROM maintenances m
                INNER JOIN users u ON u.id = m.user_id
                INNER JOIN equipments e ON e.id = m.equipment_id
                WHERE (%s = 'administrator' OR e.maintenance_group_id = %s)
            """
            values = (user_role, user_maintenance_group_id)

            cursor.execute(sql_query, values)

            maintenanceData = cursor.fetchall()

            maintenances = [
                Maintenance(**maintenance)
                for maintenance in maintenanceData
            ]

            return maintenances
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
    
    # GET de todas as manutenções de um equipamento puxando pelo id
    @staticmethod
    def get_by_id(equipment_id, user_role, user_maintenance_group_id):
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                SELECT m.id, m.maintenance_date, m.next_maintenance_date, m.description, u.username AS user, e.name AS equipment 
                FROM maintenances m
                INNER JOIN users u ON u.id = m.user_id
                INNER JOIN equipments e ON e.id = m.equipment_id
                WHERE m.equipment_id = %s AND (%s = 'administrator' OR e.maintenance_group_id = %s)
                ORDER BY m.maintenance_date DESC
            """
            values = (equipment_id, user_role, user_maintenance_group_id)

            cursor.execute(sql_query, values)

            maintenancesData = cursor.fetchall()

            maintenances = [
                Maintenance(**maintenance)
                for maintenance in maintenancesData
            ]

            return maintenances
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    # POST para criar uma nova manutenção
    @staticmethod
    def create_maintenance(maintenance):
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                INSERT INTO maintenances (maintenance_date, next_maintenance_date, description, user_id, equipment_id)
                VALUES (%s, %s, %s, %s, %s)
            """
            values = (
                maintenance.maintenance_date,
                maintenance.next_maintenance_date,
                maintenance.description,
                maintenance.user,
                maintenance.equipment
            )

            cursor.execute(sql_query, values)
            conn.commit()

            created_maintenance = maintenance.to_dict()

            return created_maintenance
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()