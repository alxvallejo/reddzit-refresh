const APP_NAME = 'REDDZIT';
//const getKey = key => `${APP_NAME}.${key}`;

const defaultOptions = {
    fontSize: 18
};

export const setOption = newOption => {
    let options = getOptions();
    let newOptions;
    newOptions = {
        ...options,
        ...newOption
    };
    localStorage.setItem(APP_NAME + '_options', JSON.stringify(newOptions));
};

export const getOptions = () => {
    let storageOptions = localStorage.getItem(APP_NAME + '_options');

    storageOptions = storageOptions ? JSON.parse(storageOptions) : {};

    return Object.assign({}, defaultOptions, storageOptions);
};
