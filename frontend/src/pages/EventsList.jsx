import React from "react";
import { useLocation } from "react-router-dom";
import EventDiscovery from "../components/RcbEventFixtures";

function EventsList() {
  const location = useLocation();
  return <EventDiscovery key={location.pathname} compact={false} />;
}

export default EventsList;
