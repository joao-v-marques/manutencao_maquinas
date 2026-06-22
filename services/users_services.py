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