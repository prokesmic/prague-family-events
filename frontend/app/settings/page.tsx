/**
 * Settings Page (Placeholder)
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your preferences and account
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>Authentication with NextAuth.js coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Preferences</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <ul className="space-y-2">
              <li>• Monthly budget tracking</li>
              <li>• Preferred event categories</li>
              <li>• Maximum distance preferences</li>
              <li>• Email notification settings</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Children Info</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>Configure ages to improve event recommendations...</p>
            <ul className="space-y-1 mt-2">
              <li>• Toddler: 1.5 years old</li>
              <li>• Child: 9 years old</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Last scrape: Daily at 3:00 AM Prague time
                </p>
                <Button variant="outline" disabled>
                  Trigger Manual Scrape
                </Button>
              </div>
              <div>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">
                    View Event Statistics
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
