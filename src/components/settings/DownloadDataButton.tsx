import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/errorLogger';

interface ExportedPhoto {
  slot: number;
  is_main: boolean | null;
  uploaded_at: string | null;
  file_name: string | null;
  external_url: string | null;
  download_url: string | null;
}

interface ExportResponse {
  exported_at: string;
  format_version: number;
  data: { photos: ExportedPhoto[] } & Record<string, unknown>;
}

const README = (exportedAt: string, missingPhotos: number) => `LovKey data export
Created: ${exportedAt}

data.json holds everything LovKey stores about you:
- account: your email, sign-up and last sign-in times, and which Terms / Privacy Policy you accepted
- profile: your profile details, match preferences and location
- description: your "about me" text
- daily_check_in: your latest mood, vibes and question-of-the-week answer
- photos: your profile photos (the files are in the photos/ folder)
- matches: everyone you have been matched with, by nickname, and what happened with each match
- messages_you_sent: every chat message you have sent
- notifications: the in-app notifications you received
- people_you_blocked and reports_you_filed

Not included, to protect other people's privacy: messages other people sent you,
their profiles and photos, and reports other people filed about you.
${missingPhotos > 0 ? `\n${missingPhotos} photo(s) could not be downloaded. Try the export again, or contact support.\n` : ''}`;

// Settings → Download my data. The export-my-data edge function returns the
// data as JSON with short-lived photo links; this downloads the photos and
// zips everything into a single file the browser saves.
const DownloadDataButton = () => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const { data: exported, error } = await supabase.functions.invoke<ExportResponse>('export-my-data', { method: 'POST' });
      if (error || !exported) throw error ?? new Error('Empty export');

      // Loaded on demand so the zip library isn't in the main bundle.
      const { zipSync, strToU8 } = await import('fflate');
      const files: Record<string, Uint8Array> = {};
      let missingPhotos = 0;

      const photos = await Promise.all(exported.data.photos.map(async (photo) => {
        const { download_url, ...rest } = photo;
        if (!download_url || !photo.file_name) return { ...rest, file: null };
        const path = `photos/slot-${photo.slot}-${photo.file_name}`;
        try {
          const res = await fetch(download_url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          files[path] = new Uint8Array(await res.arrayBuffer());
          return { ...rest, file: path };
        } catch (photoError) {
          logError(`DownloadDataButton:photo:${photo.slot}`, photoError);
          missingPhotos += 1;
          return { ...rest, file: null };
        }
      }));

      // The signed links expire within minutes, so the saved file points at
      // the photos inside the zip instead.
      const data = { ...exported.data, photos };
      files['data.json'] = strToU8(JSON.stringify({ exported_at: exported.exported_at, format_version: exported.format_version, data }, null, 2));
      files['README.txt'] = strToU8(README(exported.exported_at, missingPhotos));

      const zipped = zipSync(files, { level: 6 });
      const url = URL.createObjectURL(new Blob([zipped], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `lovkey-data-${exported.exported_at.slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      toast({
        title: 'Your data is ready',
        description: missingPhotos > 0
          ? `Downloaded, but ${missingPhotos} photo(s) couldn't be included. Try again later.`
          : 'Check your downloads for the .zip file.',
      });
    } catch (downloadError) {
      logError('DownloadDataButton:export', downloadError);
      toast({
        title: 'Could not prepare your data',
        description: 'Please try again. If it keeps failing, contact support.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" className="w-full justify-start gap-2" onClick={handleDownload} disabled={busy}>
      <Download className="h-4 w-4" />
      {busy ? 'Preparing your data...' : 'Download my data'}
    </Button>
  );
};

export default DownloadDataButton;
