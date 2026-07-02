from models.users_models import UsersModel, Users

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
            # colocar validações de required field aqui retornando raise ValueError()

            existing_user = UsersModel.get_by_username(data['username'])

            if existing_user:
                raise ValueError("Username já existe")
            
            new_user = Users(
                username=data['username'],
                name=data['name'],
                password_hash=data['password_hash'],
                email=data['email'],
                role=data['role'],
                sector=data['sector'],
                maintenance_group=data['maintenance_group']
            )

            created_user = UsersModel.create_user(new_user)

            return created_user
        except Exception as e:
            raise Exception(str(e))