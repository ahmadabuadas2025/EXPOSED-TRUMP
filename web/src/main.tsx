import { lazy, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { NotFound } from "./components/Sticker";
import "@fontsource-variable/public-sans/index.css";
import "@fontsource-variable/source-serif-4/index.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./index.css";
import { DataProvider } from "./lib/data";

// Each page is its own chunk, so a visitor downloads only what they open.
const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const MapPage = lazy(() => import("./pages/MapPage").then((m) => ({ default: m.MapPage })));
const Evidence = lazy(() => import("./pages/Evidence").then((m) => ({ default: m.Evidence })));
const Timeline = lazy(() => import("./pages/Timeline").then((m) => ({ default: m.Timeline })));
const Profiles = lazy(() => import("./pages/Profiles").then((m) => ({ default: m.Profiles })));
const Profile = lazy(() => import("./pages/Profiles").then((m) => ({ default: m.Profile })));
const Money = lazy(() => import("./pages/Money").then((m) => ({ default: m.Money })));
const Sources = lazy(() => import("./pages/Sources").then((m) => ({ default: m.Sources })));
const Method = lazy(() => import("./pages/Method").then((m) => ({ default: m.Method })));
const DataPage = lazy(() => import("./pages/DataPage").then((m) => ({ default: m.DataPage })));

// HashRouter so the static build works on any host without rewrite rules.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="map" element={<MapPage />} />
            <Route path="evidence" element={<Evidence />} />
            <Route path="timeline" element={<Timeline />} />
            <Route path="profiles" element={<Profiles />} />
            <Route path="entity/:id" element={<Profile />} />
            <Route path="money" element={<Money />} />
            <Route path="sources" element={<Sources />} />
            <Route path="method" element={<Method />} />
            <Route path="data" element={<DataPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  </StrictMode>,
);
