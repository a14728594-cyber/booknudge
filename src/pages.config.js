import AdminBillingStatus from './pages/AdminBillingStatus';
import AdminBookEdit from './pages/AdminBookEdit';
import AdminBooks from './pages/AdminBooks';
import AdminDashboard from './pages/AdminDashboard';
import AdminDebug from './pages/AdminDebug';
import AdminInquiries from './pages/AdminInquiries';
import AdminUsers from './pages/AdminUsers';
import BillingCancel from './pages/BillingCancel';
import BillingSuccess from './pages/BillingSuccess';
import BookDetail from './pages/BookDetail';
import Connect from './pages/Connect';
import DM from './pages/DM';
import DMChat from './pages/DMChat';
import DebugBilling from './pages/DebugBilling';
import DebugSentry from './pages/DebugSentry';
import DebugStatus from './pages/DebugStatus';
import Home from './pages/Home';
import MyProfile from './pages/MyProfile';
import Paywall from './pages/Paywall';
import Privacy from './pages/Privacy';
import Profile from './pages/Profile';
import Refund from './pages/Refund';
import Search from './pages/Search';
import Share from './pages/Share';
import Support from './pages/Support';
import Terms from './pages/Terms';
import Tokushoho from './pages/Tokushoho';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminBillingStatus": AdminBillingStatus,
    "AdminBookEdit": AdminBookEdit,
    "AdminBooks": AdminBooks,
    "AdminDashboard": AdminDashboard,
    "AdminDebug": AdminDebug,
    "AdminInquiries": AdminInquiries,
    "AdminUsers": AdminUsers,
    "BillingCancel": BillingCancel,
    "BillingSuccess": BillingSuccess,
    "BookDetail": BookDetail,
    "Connect": Connect,
    "DM": DM,
    "DMChat": DMChat,
    "DebugBilling": DebugBilling,
    "DebugSentry": DebugSentry,
    "DebugStatus": DebugStatus,
    "Home": Home,
    "MyProfile": MyProfile,
    "Paywall": Paywall,
    "Privacy": Privacy,
    "Profile": Profile,
    "Refund": Refund,
    "Search": Search,
    "Share": Share,
    "Support": Support,
    "Terms": Terms,
    "Tokushoho": Tokushoho,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};