/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminBillingStatus from './pages/AdminBillingStatus';
import AdminBookEdit from './pages/AdminBookEdit';
import AdminBooks from './pages/AdminBooks';
import AdminDashboard from './pages/AdminDashboard';
import AdminDebug from './pages/AdminDebug';
import AdminInquiries from './pages/AdminInquiries';
import AdminQuizForm from './pages/AdminQuizForm';
import AdminQuizzes from './pages/AdminQuizzes';
import AdminUsers from './pages/AdminUsers';
import BillingCancel from './pages/BillingCancel';
import BillingSuccess from './pages/BillingSuccess';
import Book from './pages/Book';
import BookDetail from './pages/BookDetail';
import Connect from './pages/Connect';
import DM from './pages/DM';
import DMChat from './pages/DMChat';
import DebugBilling from './pages/DebugBilling';
import DebugDiagnosis from './pages/DebugDiagnosis';
import DebugQuiz from './pages/DebugQuiz';
import DebugSentry from './pages/DebugSentry';
import DebugStatus from './pages/DebugStatus';
import Home from './pages/Home';
import Landing from './pages/Landing';
import MyProfile from './pages/MyProfile';
import Onboarding from './pages/Onboarding';
import Paywall from './pages/Paywall';
import Privacy from './pages/Privacy';
import Profile from './pages/Profile';
import Quiz from './pages/Quiz';
import QuizNew from './pages/QuizNew';
import QuizResult from './pages/QuizResult';
import Recommend from './pages/Recommend';
import Refund from './pages/Refund';
import Result from './pages/Result';
import Search from './pages/Search';
import Share from './pages/Share';
import Support from './pages/Support';
import Terms from './pages/Terms';
import Tokushoho from './pages/Tokushoho';
import genreDomain from './pages/genre[domain]';
import DeepDiagnosis from './pages/DeepDiagnosis';
import AdminDiagnosis from './pages/AdminDiagnosis';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminBillingStatus": AdminBillingStatus,
    "AdminBookEdit": AdminBookEdit,
    "AdminBooks": AdminBooks,
    "AdminDashboard": AdminDashboard,
    "AdminDebug": AdminDebug,
    "AdminInquiries": AdminInquiries,
    "AdminQuizForm": AdminQuizForm,
    "AdminQuizzes": AdminQuizzes,
    "AdminUsers": AdminUsers,
    "BillingCancel": BillingCancel,
    "BillingSuccess": BillingSuccess,
    "Book": Book,
    "BookDetail": BookDetail,
    "Connect": Connect,
    "DM": DM,
    "DMChat": DMChat,
    "DebugBilling": DebugBilling,
    "DebugDiagnosis": DebugDiagnosis,
    "DebugQuiz": DebugQuiz,
    "DebugSentry": DebugSentry,
    "DebugStatus": DebugStatus,
    "Home": Home,
    "Landing": Landing,
    "MyProfile": MyProfile,
    "Onboarding": Onboarding,
    "Paywall": Paywall,
    "Privacy": Privacy,
    "Profile": Profile,
    "Quiz": Quiz,
    "QuizNew": QuizNew,
    "QuizResult": QuizResult,
    "Recommend": Recommend,
    "Refund": Refund,
    "Result": Result,
    "Search": Search,
    "Share": Share,
    "Support": Support,
    "Terms": Terms,
    "Tokushoho": Tokushoho,
    "genre[domain]": genreDomain,
    "DeepDiagnosis": DeepDiagnosis,
    "AdminDiagnosis": AdminDiagnosis,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};