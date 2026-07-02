from database.connect_db import get_db_connection

# classe de inicialização dos users
class Users:
    def __init__(self, username, name, password_hash, email, role, sector, id=None, maintenance_group=None, is_active=True, role_id=None, sector_id=None, maintenance_group_id=None):
        self.id = id
        self.username = username
        self.name = name
        self.password_hash = password_hash
        self.email = email
        self.role = role
        self.role_id = role_id
        self.sector = sector
        self.sector_id = sector_id
        self.maintenance_group = maintenance_group
        self.maintenance_group_id = maintenance_group_id
        self.is_active = is_active

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "name": self.name,
            "password_hash": self.password_hash,
            "email": self.email,
            "role": self.role,
            "role_id": self.role_id,
            "sector": self.sector,
            "sector_id": self.sector_id,
            "maintenance_group": self.maintenance_group,
            "maintenance_group_id": self.maintenance_group_id,
            "is_active": self.is_active
        }

# classe de métodos do user
class UsersModel:
    # GET de todos os usuários cadastrados
    @staticmethod
    def get_all():
        cursor = None
        conn = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                SELECT u.id, u.username, u.name, u.password_hash, u.email, r.description as role, u.role_id, s.description as sector, u.sector_id, u.is_active, mg.description as maintenance_group, u.maintenance_group_id
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id
                INNER JOIN sectors s ON s.id = u.sector_id
                INNER JOIN maintenance_group mg ON mg.id = u.maintenance_group_id
            """
            cursor.execute(sql_query)

            usersData = cursor.fetchall()

            # transforma cada dict do banco em objeto do model Users
            users = [
                Users(**user)
                for user in usersData
            ]
        
            return users
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    # GET de um único usuário pelo username
    @staticmethod
    def get_by_username(username):
        cursor = None
        conn = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                SELECT u.id, u.username, u.name, u.password_hash, u.email, r.description as role, s.description as sector, u.is_active
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id
                INNER JOIN sectors s ON s.id = u.sector_id
                WHERE u.username = %s
            """
            values = (username,)

            cursor.execute(sql_query, values)
            userData = cursor.fetchone()

            # tranforma o dict do objeto em modelo Users
            if not userData:
                return None
            
            user = Users(**userData)

            return user
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    @staticmethod
    def get_by_id(user_id):
        cursor = None
        conn = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                SELECT u.id, u.username, u.name, u.password_hash, u.email, r.description as role, s.description as sector, u.is_active
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id
                INNER JOIN sectors s ON s.id = u.sector_id
                WHERE u.id = %s
            """
            values = (user_id,)

            cursor.execute(sql_query, values)
            userData = cursor.fetchone()

            if not userData:
                return None

            user = Users(**userData)

            return user
        except Exception as e:
            raise Exception(str(e))
        finally:
            if conn:
                conn.close()
            if cursor:
                cursor.close()

    # função para criar um novo usuário
    @staticmethod
    def create_user(user):
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                INSERT INTO users (username, name, password_hash, email, role_id, sector_id, maintenance_group_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            values = (user.username, user.name, user.password_hash, user.email, user.role, user.sector, user.maintenance_group)

            cursor.execute(sql_query, values)
            conn.commit()

            created_user = user.to_dict()

            return created_user
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    # DELETE de um usuário
    @staticmethod
    def delete_user(user_id):
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                DELETE FROM users u
                WHERE u.id = %s
            """
            values = (user_id,)

            cursor.execute(sql_query, values)
            conn.commit()

            return True
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    # PUT de um usuário
    @staticmethod
    def update_user(user):
        conn = None
        cursor = None
        try:
            conn, cursor = get_db_connection()

            sql_query = """
                UPDATE users
                SET username = %s, name = %s, password_hash = %s, email = %s, role_id = %s, sector_id = %s, maintenance_group_id = %s, is_active = %s
                WHERE id = %s
            """
            values = (
                user.username,
                user.name,
                user.password_hash,
                user.email,
                user.role,
                user.sector,
                user.maintenance_group,
                user.is_active,
                user.id
            )

            cursor.execute(sql_query, values)
            conn.commit()

            updated_user = user.to_dict()

            return updated_user
        except Exception as e:
            raise Exception(str(e))
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()