import PublicController from './PublicController'
import Community from './Community'
import CitizenReportController from './CitizenReportController'
import NotificationController from './NotificationController'
import Admin from './Admin'
import Agency from './Agency'
import Settings from './Settings'
const Controllers = {
    PublicController: Object.assign(PublicController, PublicController),
Community: Object.assign(Community, Community),
CitizenReportController: Object.assign(CitizenReportController, CitizenReportController),
NotificationController: Object.assign(NotificationController, NotificationController),
Admin: Object.assign(Admin, Admin),
Agency: Object.assign(Agency, Agency),
Settings: Object.assign(Settings, Settings),
}

export default Controllers