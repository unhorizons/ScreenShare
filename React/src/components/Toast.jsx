import { useEffect } from "react";
import styles from "./Toast.module.css"; // Assuming CSS Modules for styling

const Toast = ({ msg, type, onClose }) => {
    useEffect(() => {
        if (type !== "waiting") {
            const timer = setTimeout(onClose, 3000); // Auto-close after animation
            return () => clearTimeout(timer);
        }
    }, [type, onClose]);

    return (
        <div className={`${styles.toast} ${styles[type]}`}>
            {type === "waiting" && <div className={styles.spinner}></div>}
            {msg}
        </div>
    );
};

export default Toast;
