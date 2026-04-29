import { Navigate, createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/modules/auth/LoginPage";
import { ProtectedRoute } from "@/modules/auth/ProtectedRoute";
import { ResetPasswordPage, UpdatePasswordPage } from "@/modules/auth/ResetPasswordPage";
import { ProjectDocumentsPage, ProjectPlatPage } from "@/modules/documents/ProjectDocumentsPage";
import { DesignConsolePage } from "@/modules/design/DesignConsolePage";
import { ProjectMapPage } from "@/modules/map/ProjectMapPage";
import { ProjectParcelPage } from "@/modules/parcel/ProjectParcelPage";
import { ProjectDetailPage } from "@/modules/projects/ProjectDetailPage";
import { ProjectWorkflowPage } from "@/modules/projects/ProjectWorkflowPage";
import { ProjectsPage } from "@/modules/projects/ProjectsPage";
import { ProjectSitePlannerPage } from "@/modules/siteplanner/ProjectSitePlannerPage";
import { ProjectSubdivisionPage } from "@/modules/subdivision/ProjectSubdivisionPage";
import { SysadminUsersPage } from "@/modules/sysadmin/SysadminUsersPage";
import { ProjectTitlePage } from "@/modules/title/ProjectTitlePage";
import { ProjectTraversePage } from "@/modules/traverse/ProjectTraversePage";
import {
  AdvancedSurveyPage,
  DocumentsPage,
  HomePage,
  PropertyPage,
  SitePlannerPage,
  SubdivisionPage,
  WorkspaceLandingPage,
  YieldPage,
} from "@/modules/workspace/HomePage";
import {
  BillingPage,
  CodeLibrariesPage,
  CoordinateSystemsPage,
  MapLayersPage,
  NtripPage,
  SettingsPage,
  TeamPage,
} from "@/modules/workspace/SettingsPages";
import { ProjectYieldPage } from "@/modules/yield/ProjectYieldPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate replace to="/app" />,
  },
  {
    path: "/auth/login",
    element: <LoginPage />,
  },
  {
    path: "/auth/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/auth/update-password",
    element: <UpdatePasswordPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/app",
        element: <AppShell />,
        children: [
          { index: true, element: <WorkspaceLandingPage /> },
          { path: "dashboard", element: <HomePage /> },
          { path: "projects", element: <ProjectsPage /> },
          { path: "parcel", element: <PropertyPage /> },
          { path: "yield", element: <YieldPage /> },
          { path: "subdivision", element: <SubdivisionPage /> },
          { path: "site-planner", element: <SitePlannerPage /> },
          { path: "documents", element: <DocumentsPage /> },
          { path: "advanced/survey", element: <AdvancedSurveyPage /> },
          { path: "advanced/ntrip-profiles", element: <NtripPage /> },
          { path: "advanced/code-libraries", element: <CodeLibrariesPage /> },
          { path: "advanced/coordinate-systems", element: <CoordinateSystemsPage /> },
          { path: "projects/:projectId", element: <Navigate replace to="workflow" /> },
          { path: "projects/:projectId/workflow", element: <ProjectWorkflowPage /> },
          { path: "projects/:projectId/title", element: <ProjectTitlePage /> },
          { path: "projects/:projectId/design", element: <DesignConsolePage /> },
          { path: "projects/:projectId/overview", element: <ProjectDetailPage /> },
          { path: "projects/:projectId/parcel", element: <ProjectParcelPage /> },
          { path: "projects/:projectId/yield", element: <ProjectYieldPage /> },
          { path: "projects/:projectId/subdivision", element: <ProjectSubdivisionPage /> },
          { path: "projects/:projectId/site-planner", element: <ProjectSitePlannerPage /> },
          { path: "projects/:projectId/documents", element: <ProjectDocumentsPage /> },
          { path: "projects/:projectId/plat", element: <ProjectPlatPage /> },
          { path: "projects/:projectId/map", element: <ProjectMapPage /> },
          { path: "projects/:projectId/traverse", element: <ProjectTraversePage /> },
          { path: "presets/ntrip", element: <Navigate replace to="/app/advanced/ntrip-profiles" /> },
          { path: "presets/code-libraries", element: <Navigate replace to="/app/advanced/code-libraries" /> },
          { path: "presets/map-layers", element: <MapLayersPage /> },
          { path: "presets/coordinate-systems", element: <Navigate replace to="/app/advanced/coordinate-systems" /> },
          { path: "team", element: <TeamPage /> },
          { path: "sysadmin/users", element: <SysadminUsersPage /> },
          { path: "billing", element: <BillingPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "settings/map-layers", element: <MapLayersPage /> },
        ],
      },
    ],
  },
]);
