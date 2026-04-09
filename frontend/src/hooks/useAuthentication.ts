import { useAppSelector } from "./useAppDispatch"



export const useAuthentication = () => {
    const currentUser = useAppSelector(state => state.currentUser);

    return { ...currentUser }
}   

