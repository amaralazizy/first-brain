import { Toaster as Sonner, toast as sonnerToast } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const toastOptions: ToasterProps = {
  className: 'font-sans',
  position: 'bottom-right',
  toastOptions: {
    className: '',
    style: {
      fontSize: '14px',
    },
  },
}

export function Toaster(props: ToasterProps) {
  return <Sonner {...props} className={props.className ?? toastOptions.className} position={props.position ?? toastOptions.position} toastOptions={props.toastOptions ?? toastOptions.toastOptions} />
}

export const toast = sonnerToast