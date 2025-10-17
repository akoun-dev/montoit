import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Shield,
  CheckCircle,
  Lock,
  FileText,
  Clock,
  BarChart3,
  AlertTriangle,
  Flag,
  FileBarChart,
  PenTool,
  Home,
  Users,
  Settings,
  Bell,
  Image,
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  badges: {
    certifications: number;
    disputes: number;
    properties: number;
    overdueApplications: number;
  };
}

export const AdminSidebar = ({ activeTab, onTabChange, badges }: AdminSidebarProps) => {
  const menuGroups = [
    {
      label: 'Principal',
      items: [
        { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
      ]
    },
    {
      label: 'Sécurité',
      items: [
        { id: 'certifications', label: 'Certifications', icon: Shield, badge: badges.certifications },
        { id: 'verifications', label: 'Vérifications', icon: CheckCircle },
        { id: 'mfa', label: 'Sécurité 2FA', icon: Lock },
        { id: 'audit', label: 'Audit', icon: FileText },
        { id: 'security', label: 'Accès sensibles', icon: Lock },
      ]
    },
    {
      label: 'Gestion',
      items: [
        { id: 'properties', label: 'Biens', icon: Home, badge: badges.properties },
        { id: 'users', label: 'Utilisateurs', icon: Users },
        { id: 'leases', label: 'Baux', icon: FileText },
      ]
    },
    {
      label: 'Outils',
      items: [
        { id: 'processing', label: 'Traitement', icon: Clock, badge: badges.overdueApplications },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'alerts', label: 'Alertes Propriétés', icon: Bell },
        { id: 'disputes', label: 'Litiges', icon: AlertTriangle, badge: badges.disputes },
        { id: 'moderation', label: 'Modération', icon: Flag },
        { id: 'reporting', label: 'Rapports', icon: FileBarChart },
        { id: 'electronic-signatures', label: 'Signatures Élec.', icon: PenTool },
        { id: 'illustrations', label: 'Illustrations', icon: Image },
      ]
    }
  ];

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      isActive={activeTab === item.id}
                      className="w-full"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};