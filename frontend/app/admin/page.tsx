/**
 * Admin Dashboard Page
 * Monitor scrapers, view quality metrics, and manually trigger scrapes
 */

'use client';

import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Play,
  RefreshCcw,
  TrendingUp,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface ScraperHealth {
  source: string;
  status: 'healthy' | 'warning' | 'error';
  totalEvents: number;
  recentEvents: number;
  lastActive: string | null;
}

interface QualityStats {
  source: string;
  totalEvents: number;
  avgScores: {
    toddler: number;
    child: number;
    family: number;
  };
  dataCompleteness: number;
  hasImage: number;
  hasLocation: number;
  hasPrice: number;
}

export default function AdminPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [qualityData, setQualityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState<string | null>(null);
  const [scrapeResult, setScrapeResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [health, quality] = await Promise.all([
        adminAPI.getScraperHealth(),
        adminAPI.getQualityStats(),
      ]);
      setHealthData(health);
      setQualityData(quality);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerScrape = async (source?: string) => {
    try {
      setScraping(source || 'all');
      setScrapeResult(null);
      const result = await adminAPI.triggerScrape(source);
      setScrapeResult(result);
      // Reload data after scrape
      await loadData();
    } catch (error) {
      console.error('Scrape failed:', error);
      setScrapeResult({ success: false, error: 'Scrape failed' });
    } finally {
      setScraping(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCcw className="w-12 h-12 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-muted-foreground">Loading admin data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor scrapers and manage data quality
            </p>
          </div>
        </div>
        <Button onClick={() => loadData()} variant="outline">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Scrapers</p>
              <p className="text-2xl font-bold">{healthData?.totalScrapers || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Healthy</p>
              <p className="text-2xl font-bold text-green-600">
                {healthData?.healthyScraper || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-muted-foreground">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">
                {healthData?.warningScraper || 0}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Errors</p>
              <p className="text-2xl font-bold text-red-600">
                {healthData?.errorScraper || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Manual Scrape Trigger */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Play className="w-5 h-5" />
          Manual Scrape Trigger
        </h2>
        <div className="flex gap-3 mb-4">
          <Button
            onClick={() => handleTriggerScrape()}
            disabled={scraping !== null}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {scraping === 'all' ? (
              <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Scrape All Sources
          </Button>
        </div>

        {scrapeResult && (
          <div
            className={`p-4 rounded-lg ${
              scrapeResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p className="font-semibold mb-2">
              {scrapeResult.success ? 'Scrape Completed' : 'Scrape Failed'}
            </p>
            {scrapeResult.summary && (
              <div className="text-sm space-y-1">
                <p>Events Found: {scrapeResult.summary.eventsFound}</p>
                <p>Events Stored: {scrapeResult.summary.eventsStored}</p>
                <p>Errors: {scrapeResult.summary.errors}</p>
                <p>Execution Time: {(scrapeResult.summary.sources[0]?.executionTime / 1000).toFixed(1)}s</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Scraper Health Status */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Scraper Health Status
        </h2>
        <div className="space-y-3">
          {healthData?.scrapers?.map((scraper: ScraperHealth) => (
            <div
              key={scraper.source}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(scraper.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{scraper.source}</p>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        scraper.status
                      )}`}
                    >
                      {scraper.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {scraper.totalEvents} total events, {scraper.recentEvents} recent
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleTriggerScrape(scraper.source)}
                disabled={scraping !== null}
                size="sm"
                variant="outline"
              >
                {scraping === scraper.source ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Data Quality Metrics */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Data Quality Metrics
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Source</th>
                <th className="text-right p-2">Events</th>
                <th className="text-right p-2">Completeness</th>
                <th className="text-right p-2">Has Image</th>
                <th className="text-right p-2">Has Location</th>
                <th className="text-right p-2">Has Price</th>
                <th className="text-right p-2">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {qualityData?.sources?.map((source: QualityStats) => (
                <tr key={source.source} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{source.source}</td>
                  <td className="text-right p-2">{source.totalEvents}</td>
                  <td className="text-right p-2">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: `${source.dataCompleteness}%` }}
                        />
                      </div>
                      <span>{source.dataCompleteness}%</span>
                    </div>
                  </td>
                  <td className="text-right p-2">{source.hasImage}%</td>
                  <td className="text-right p-2">{source.hasLocation}%</td>
                  <td className="text-right p-2">{source.hasPrice}%</td>
                  <td className="text-right p-2">
                    {Math.round(
                      (source.avgScores.toddler +
                        source.avgScores.child +
                        source.avgScores.family) /
                        3
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Last Scrape Info */}
      {healthData?.lastScrape && (
        <div className="mt-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          Last scrape: {new Date(healthData.lastScrape).toLocaleString()}
        </div>
      )}
    </div>
  );
}
