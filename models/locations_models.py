from database.connect_db import get_db_connection

class Locations:
    def __init__(self, description, id=None):
        self.id = id
        self.description = description

    def to_dict(self):
        return {
            "id": self.id,
            "description": self.description
        }
    
class LocationsModel:
    # GET de todas as locations cadastradas no sistema
    def get_all():
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = "SELECT l.id, l.description FROM locations l"
            
            cursor.execute(sql_query)
            locationData = cursor.fetchall()

            locations = [
                Locations(**location)
                for location in locationData
            ]

            return locations
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()