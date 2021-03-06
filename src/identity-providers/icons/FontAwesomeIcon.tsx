import React from "react";
import bitbucketIcon from "./bitbucket-brands.svg";
import microsoftIcon from "./microsoft-brands.svg";
import instagramIcon from "./instagram-brands.svg";
import paypalIcon from "./paypal-brands.svg";

type FontAwesomeIconProps = {
  icon: "bitbucket" | "microsoft" | "instagram" | "paypal";
};
export const FontAwesomeIcon = ({ icon }: FontAwesomeIconProps) => {
  const styles = { style: { height: "2em", width: "2em" } };
  switch (icon) {
    case "bitbucket":
      return (
        <img src={bitbucketIcon} {...styles} aria-label="bitbucket icon" />
      );
    case "microsoft":
      return (
        <img src={microsoftIcon} {...styles} aria-label="microsoft icon" />
      );
    case "instagram":
      return (
        <img src={instagramIcon} {...styles} aria-label="instagram icon" />
      );
    case "paypal":
      return <img src={paypalIcon} {...styles} aria-label="paypal icon" />;
    default:
      return <></>;
  }
};
