import User from "@/models/user.model";

export const generateAccessTokenAndRefreshToken = async (userId: string) => {
  const user = await User.findById(userId);

  if(!user) {
    throw new Error("User not found!!");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;

  await user.save({
    validateBeforeSave: false
  });

  return {
    accessToken,
    refreshToken
  }

}