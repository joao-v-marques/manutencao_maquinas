from routes.render_pages.render_login import bp_render_login
from routes.render_pages.render_dashboard import bp_render_dashboard
from routes.render_pages.render_equipments import bp_render_equipments

prefix = "/portal-manutencao"

def config_all(app):
    config_bps(app)

def config_bps(app):
    # registros para renderização
    app.register_blueprint(bp_render_login, url_prefix=prefix)
    app.register_blueprint(bp_render_dashboard, url_prefix=prefix)
    app.register_blueprint(bp_render_equipments, url_prefix=prefix)

    # registro de endpoints