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
    def get_all():
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                SELECT m.id, m.maintenance_date, m.next_maintenance_date, m.description, u.username AS user, e.name AS equipment 
                FROM maintenances m
                INNER JOIN users u ON u.id = m.user_id
                INNER JOIN equipments e ON e.id = m.equipment_id
            """
            cursor.execute(sql_query)

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
            