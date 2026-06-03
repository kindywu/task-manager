import { useState } from 'react';
import { Modal, Button, Checkbox, Space } from 'antd';
import { useTranslation } from 'react-i18next';

interface CloseDialogProps {
  open: boolean;
  onHide: (remember: boolean) => void;
  onQuit: (remember: boolean) => void;
}

export default function CloseDialog({ open, onHide, onQuit }: CloseDialogProps) {
  const { t } = useTranslation();
  const [remember, setRemember] = useState(false);

  return (
    <Modal
      title={t('closeDialog.title')}
      open={open}
      closable={false}
      maskClosable={false}
      footer={null}
      centered
    >
      <p>{t('closeDialog.message')}</p>
      <div style={{ marginBottom: 16 }}>
        <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>
          {t('closeDialog.remember')}
        </Checkbox>
      </div>
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button onClick={() => onHide(remember)} type="default">
          {t('closeDialog.hide')}
        </Button>
        <Button onClick={() => onQuit(remember)} type="primary" danger>
          {t('closeDialog.quit')}
        </Button>
      </Space>
    </Modal>
  );
}
