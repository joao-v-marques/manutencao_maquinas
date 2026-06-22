from database.connect_db import get_db_connection

# classe de inicialização dos users
class Users:
    def __init__(self, username, name, password_hash, email, role, id=None, is_active=True):
        self.id = id
        self.username = username
        self.name = name
        self.password_hash = password_hash
        self.email = email
        self.role = role
        self.is_active = is_active

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "name": self.name,
            "password_hash": self.password_hash,
            "email": self.email,
            "role": self.role,
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
                SELECT u.id, u.username, u.name, u.password_hash, u.email, r.description as role, u.is_active
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id
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
                SELECT u.id, u.username, u.name, u.password_hash, u.email, r.description as role, u.is_active
                FROM users u
                INNER JOIN roles r ON r.id = u.role_id
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