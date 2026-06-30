from routes.render_pages.render_login import bp_render_login
from routes.render_pages.render_dashboard import bp_render_dashboard
from routes.render_pages.render_equipments import bp_render_equipments
from routes.render_pages.render_maintenance import bp_render_maintenance

from routes.users_controllers import bp_users
from routes.auth_controller import bp_auth
from routes.equipments_controller import bp_equipments
from routes.locations_controller import bp_locations
from routes.sectors_controller import bp_sectors
from routes.maintenance_group_controller import bp_maintenance_group
from routes.equipment_status_routes import bp_equipment_status
from routes.maintenance_controller import bp_maintenances

prefix = "/portal-manutencao"

def config_all(app):
    config_bps(app)

def config_bps(app):
    # registros para renderização
    app.register_blueprint(bp_render_login, url_prefix=prefix)
    app.register_blueprint(bp_render_dashboard, url_prefix=prefix)
    app.register_blueprint(bp_render_equipments, url_prefix=prefix)
    app.register_blueprint(bp_render_maintenance, url_prefix=prefix)

    # registro de endpoints
    app.register_blueprint(bp_users, url_prefix=prefix)
    app.register_blueprint(bp_auth, url_prefix=prefix)
    app.register_blueprint(bp_equipments, url_prefix=prefix)
    app.register_blueprint(bp_locations, url_prefix=prefix)
    app.register_blueprint(bp_sectors, url_prefix=prefix)
    app.register_blueprint(bp_maintenance_group, url_prefix=prefix)
    app.register_blueprint(bp_equipment_status, url_prefix=prefix)
    app.register_blueprint(bp_maintenances, url_prefix=prefix)