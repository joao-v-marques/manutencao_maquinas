from database.connect_db import get_db_connection

class Role:
    def __init__(self, description, id=None):
        self.id = id
        self.description = description

    def to_dict(self):
        return {
            "id": self.id,
            "description": self.description
        }
    
class RoleModel:
    # GET de todas as roles cadastradas no sistema
    @staticmethod
    def get_all():
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = "SELECT * FROM roles"
            cursor.execute(sql_query)

            roleData = cursor.fetchall()

            roles = [
                Role(**role)
                for role in roleData
            ]

            return roles
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()