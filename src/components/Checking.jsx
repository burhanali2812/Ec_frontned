import React, { useState } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  IconButton, 
  Divider,
  Typography,
  Box
} from '@mui/material';
import {
  Menu as MenuIcon,
  Report as ReportIcon,
  People as PeopleIcon,
  CalendarToday as AttendanceIcon,
  ExitToApp as LogoutIcon,
  Lock as PasswordIcon,
  AccountCircle as AccountIcon,
  HowToReg as RegisterIcon
} from '@mui/icons-material';

const Sidebar = () => {
  const [open, setOpen] = useState(true);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <div style={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? 240 : 56,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? 240 : 56,
            boxSizing: 'border-box',
            transition: 'width 0.3s ease',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', padding: '8px 16px', minHeight: '64px' }}>
          <IconButton onClick={toggleDrawer}>
            <MenuIcon />
          </IconButton>
          {open && <Typography variant="h6" noWrap>Menu</Typography>}
        </Box>
        
        <Divider />
        
        <List>
          <ListItem button>
            <ListItemIcon>
              <ReportIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Report Lost Items" />}
          </ListItem>
          
          <ListItem button>
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Students" />}
          </ListItem>
          
          <ListItem button>
            <ListItemIcon>
              <AttendanceIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Attendance" />}
          </ListItem>
          
          <ListItem button>
            <ListItemIcon>
              <PasswordIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Forget Password?" />}
          </ListItem>
          
          <ListItem button>
            <ListItemIcon>
              <AccountIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Login" />}
          </ListItem>
          
          <ListItem button>
            <ListItemIcon>
              <RegisterIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Register" />}
          </ListItem>
          
          <Divider />
          
          <ListItem button>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Logout" />}
          </ListItem>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Welcome, Name...
        </Typography>
        <Typography paragraph>
          Content Number
          ......
        </Typography>
        <Typography paragraph>
          Don't have an account? Register
        </Typography>
      </Box>
    </div>
  );
};

export default Sidebar;