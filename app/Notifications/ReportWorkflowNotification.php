<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReportWorkflowNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $eventType,
        public readonly string $title,
        public readonly string $message,
        public readonly string $url,
        public readonly ?string $trackingCode = null,
        public readonly string $tone = 'info',
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (config('services.jagain.mail_notifications_enabled')) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'event_type' => $this->eventType,
            'title' => $this->title,
            'message' => $this->message,
            'url' => $this->url,
            'tracking_code' => $this->trackingCode,
            'tone' => $this->tone,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("[JAGAIN AI] {$this->title}")
            ->greeting('Halo,')
            ->line($this->message)
            ->action('Buka Detail Laporan', url($this->url))
            ->line('Pemberitahuan otomatis dari platform JAGAIN Kalimantan.');
    }
}
