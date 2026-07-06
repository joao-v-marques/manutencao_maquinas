from models.users_models import UsersModel, Users
from utils.security import hash_password

class UsersService:
    # função para retornar todos os usuários cadastrados no sistema
    @staticmethod
    def get_all():
        try:
            users = UsersModel.get_all()

            return users
        except Exception as e:
            raise Exception(str(e))
        
    # função cadastrar usuário
    @staticmethod
    def create_user(data):
        try:
            required_fields = [
                "username",
                "name",
                "password_hash",
                "role",
                "sector",
                "maintenance_group"
            ]

            for field in required_fields:
                value = data.get(field)
                if value is None or (isinstance(value, str) and not value.strip()):
                    raise ValueError(f"O campo {field} não pode estar vazio")

            if len(data['password_hash']) < 6:
                raise ValueError("Senha deve ter ao menos 6 caracteres")

            existing_user = UsersModel.get_by_username(data['username'])

            if existing_user:
                raise ValueError("Username já existe")
            
            password_hash = hash_password(data['password_hash'])
            
            new_user = Users(
                username=data['username'],
                name=data['name'],
                password_hash=password_hash,
                email=data['email'],
                role=data['role'],
                sector=data['sector'],
                maintenance_group=data['maintenance_group']
            )

            created_user = UsersModel.create_user(new_user)

            return created_user
        except Exception as e:
            raise Exception(str(e))

    # função deletar usuário
    @staticmethod
    def delete_user(user_id):
        try:
            user = UsersModel.get_by_id(user_id)

            if not user:
                raise ValueError("Não foi encontrado usuário com esse ID")

            UsersModel.delete_user(user_id)

            return True
        except Exception as e:
            raise Exception(str(e))

    # função atualizar usuário
    @staticmethod
    def update_user(user_id, data):
        try:
            existing_user = UsersModel.get_by_id(user_id)

            if not existing_user:
                raise ValueError("Não foi encontrado usuário com esse ID")

            # colocar validações de required field aqui retornando raise ValueError()

            new_password = data.get('password')
            password_hash = hash_password(new_password) if new_password else existing_user.password_hash

            updated_user = Users(
                id=user_id,
                username=data['username'],
                name=data['name'],
                password_hash=password_hash,
                email=data['email'],
                role=data['role'],
                sector=data['sector'],
                maintenance_group=data['maintenance_group'],
                is_active=data['is_active'] in (True, "true", "True")
            )

            return UsersModel.update_user(updated_user)
        except Exception as e:
            raise Exception(str(e))