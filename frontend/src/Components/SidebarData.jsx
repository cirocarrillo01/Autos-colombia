// frontend/src/Components/SidebarData.jsx
import React from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CarRentalIcon from "@mui/icons-material/CarRental";
import BookIcon from "@mui/icons-material/Book";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

export const SidebarData = [
  {
    title: "Dashboard",
    icon: <DashboardIcon />,
    link: "/dashboard",
  },
  {
    title: "Vehículo",
    icon: <CarRentalIcon />,
    link: "/vehiculo",
  },
  {
    title: "Ingreso/Salida",
    icon: <BookIcon />,
    link: "/ingreso/salida",
  },
  {
    title: "Mensualidades",
    icon: <CalendarMonthIcon />,
    link: "/mensualidad",
  },
];
