
export const generateRandomString = (length: number): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateStudentCredentials = () => {
  return {
    username: 'stu_' + generateRandomString(5),
    password: generateRandomString(8)
  };
};
