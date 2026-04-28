import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { downloadDocument } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface DownloadButtonProps {
  filePath: string;
  fileName: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export const DownloadButton = ({
  filePath,
  fileName,
  variant = 'outline',
  size = 'sm',
  className,
  children,
}: DownloadButtonProps) => {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const success = await downloadDocument(filePath, fileName);
      if (success) {
        toast({ title: 'Download started', description: fileName });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Download failed',
        description: err.message || 'Could not download file',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={downloading}
      className={className}
    >
      {downloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          {children || 'Download'}
        </>
      )}
    </Button>
  );
};
