'use client';

import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function UsageProgress({ dailyQueries, maxQueries }) {
  const percentage = (dailyQueries / maxQueries) * 100;
  const remaining = maxQueries - dailyQueries;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {remaining > 0 ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          Daily Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Questions asked today</span>
            <span className="font-medium">
              {dailyQueries}/{maxQueries}
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {remaining > 0 
              ? `${remaining} questions remaining today`
              : 'Daily limit reached. Resets at midnight.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}