import Error from '../assets/images/error.svg?react'

interface Props {
  message: string;
  onRetry: () => void;
  onClose: () => void;
}

const ErrorPage: React.FC<Props> = ({ message, onClose, onRetry }) => {
  return (
    <div className="flex-centerc h-screen w-screen">
      <Error height={300} />
      <p className='error-message'>{message}</p>
      <div className="flex-center">
        <button onClick={onRetry}>Try again</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ErrorPage;
