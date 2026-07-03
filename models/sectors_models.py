from database.connect_db import get_db_connection

class Sector:
    def __init__(self, description, id=None):
        self.id = id
        self.description = description

    def to_dict(self):
        return {
            "id": self.id,
            "description": self.description
        }
    
class SectorModel:
    def get_all():
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = "SELECT s.id, s.description FROM sectors s ORDER BY description"

            cursor.execute(sql_query)
            sectorData = cursor.fetchall()

            sectors = [
                Sector(**sector)
                for sector in sectorData
            ]
            
            return sectors
        except Exception as e:
            raise Exception(str(e))
        finally:
            if conn:
                conn.close()
            if cursor:
                cursor.close()