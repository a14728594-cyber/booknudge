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
import AdminBookEdit from './pages/AdminBookEdit';
import AdminBooks from './pages/AdminBooks';
import AdminDashboard from './pages/AdminDashboard';
import AdminInquiries from './pages/AdminInquiries';
import AdminUsers from './pages/AdminUsers';
import BookDetail from './pages/BookDetail';
import Home from './pages/Home';
import Landing from './pages/Landing';
import MyProfile from './pages/MyProfile';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import Quiz from './pages/Quiz';
import Recommend from './pages/Recommend';
import Result from './pages/Result';
import Search from './pages/Search';
import Share from './pages/Share';
import Support from './pages/Support';
import genreDomain from './pages/genre[domain]';
import bookId from './pages/book[id]';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminBookEdit": AdminBookEdit,
    "AdminBooks": AdminBooks,
    "AdminDashboard": AdminDashboard,
    "AdminInquiries": AdminInquiries,
    "AdminUsers": AdminUsers,
    "BookDetail": BookDetail,
    "Home": Home,
    "Landing": Landing,
    "MyProfile": MyProfile,
    "Onboarding": Onboarding,
    "Profile": Profile,
    "Quiz": Quiz,
    "Recommend": Recommend,
    "Result": Result,
    "Search": Search,
    "Share": Share,
    "Support": Support,
    "genre[domain]": genreDomain,
    "book[id]": bookId,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};