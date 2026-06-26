from database.connect_db import get_db_connection

class MaintenanceGroup:
    def __init__(self, description, id=None):
        self.id = id
        self.description = description

    def to_dict(self):
        return {
            "id": self.id,
            "description": self.description
        }
    
class MaintenanceGroupModel:
    def get_all():
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = "SELECT mg.id, mg.description FROM maintenance_group mg"
            cursor.execute(sql_query)

            maintenance_groupData = cursor.fetchall()

            maintenance_groups = [
                MaintenanceGroup(**maintenance_group)
                for maintenance_group in maintenance_groupData
            ]

            return maintenance_groups
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()