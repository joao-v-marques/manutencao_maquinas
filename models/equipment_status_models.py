from database.connect_db import get_db_connection

class EquipmentStatus:
    def __init__(self, description, id=None):
        self.id = id
        self.description = description

    def to_dict(self):
        return {
            "id": self.id,
            "description": self.description
        }
    
class EquipmentStatusModel:
    def get_all():
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = "SELECT es.id, es.description FROM equipment_status es"
            cursor.execute(sql_query)

            equipment_statusData = cursor.fetchall()
            
            equipment_status = [
                EquipmentStatus(**equipment_status)
                for equipment_status in equipment_statusData
            ]

            return equipment_status
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()